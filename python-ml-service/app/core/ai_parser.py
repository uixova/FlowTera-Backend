"""
AI-powered invoice parser.

Primary:  Google Gemini 1.5 Flash  (GEMINI_API_KEY)
Fallback: OpenAI GPT-4o-mini       (OPENAI_API_KEY)

Security hardening:
  - AI responses parsed as JSON only — never eval'd or executed
  - All string fields stripped of HTML/JS injection patterns
  - Numeric amounts validated against plausible range (0.01–999 999)
  - Currency, category, payment_method validated against strict whitelists
  - Date/time validated against exact regex patterns
  - Prompt-injection resistance: receipt content is IMAGE data, not injected text;
    for text-path (PDF), the AI is instructed to return JSON only and the response
    is validated structurally, never trusted as commands
"""
import json
import re
import io
import base64
import logging
from typing import Optional

from google import genai
from google.genai import types as genai_types
from PIL import Image

from app.config import settings
from app.schemas.ocr import ParsedInvoice

logger = logging.getLogger(__name__)

# Security whitelists
_CURRENCIES = frozenset({
    "USD", "EUR", "GBP", "TRY", "JPY", "CHF", "CAD", "AUD", "CNY", "INR",
    "RUB", "BRL", "MXN", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON",
    "SGD", "HKD", "NZD", "ZAR", "AED", "SAR", "ILS", "MYR", "THB", "IDR",
    "PHP", "VND", "KRW", "EGP", "NGN", "KES", "GHS", "MAD", "DZD", "PKR",
})
_CATEGORIES = frozenset({
    "Food & Beverage", "Groceries", "Transportation", "Healthcare",
    "Entertainment", "Utilities", "Shopping", "Accommodation", "Technology", "Other",
})
_PAYMENTS = frozenset({
    "Cash", "Credit Card", "Debit Card", "Bank Transfer", "Mobile Payment", "Check",
})

_DATE_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$")
_TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
_HTML_RE = re.compile(r"<[^>]+>", re.DOTALL)

# Prompts
_SCHEMA_COMMENT = """\
{
  "merchant": "store/business name or null",
  "amount": 84.80,
  "currency": "ISO-4217 code (GBP/USD/EUR/TRY…) or null",
  "date": "YYYY-MM-DD or null",
  "time": "HH:MM 24h or null",
  "category": "Food & Beverage | Groceries | Transportation | Healthcare | Entertainment | Utilities | Shopping | Accommodation | Technology | Other — or null",
  "payment_method": "Cash | Credit Card | Debit Card | Bank Transfer | Mobile Payment | Check — or null"
}"""

IMAGE_PROMPT = f"""Analyze this receipt/invoice image and extract structured data.
Return ONLY a valid JSON object — no markdown, no explanation:
{_SCHEMA_COMMENT}

Rules:
- amount: FINAL TOTAL the customer paid, including all taxes/VAT. NOT a subtotal, NOT an approval/reference code, NOT a single item price. Look for labels: Grand Total, Total Due, Amount Due, TOTAL, Genel Toplam, Toplam Tutar.
- currency: detect from symbol (£→GBP  $→USD  €→EUR  ₺→TRY  ¥→JPY) or text. Default USD only when truly absent.
- date/time: from the receipt date field, not today's date.
- Use null for uncertain fields."""

TEXT_PROMPT = f"""Extract structured invoice data from this receipt text.
Return ONLY a valid JSON object — no markdown, no explanation:
{_SCHEMA_COMMENT}

Rules:
- amount: FINAL TOTAL including VAT. Priority order: Grand Total > Total Due > Amount Due > TOTAL > Genel Toplam > Toplam. NEVER use approval codes, trace/reference numbers, order IDs, or subtotals.
- currency: from symbol (£→GBP  $→USD  €→EUR  ₺→TRY) or text.
- Use null for uncertain fields.

Receipt text:
"""

RAW_TEXT_PROMPT = (
    "Transcribe all visible text from this receipt/invoice image exactly as it appears, "
    "preserving line structure. Do not summarize or interpret — output only the raw text."
)


# Security sanitizer

def _safe_str(val: object, max_len: int = 100) -> Optional[str]:
    """Strip HTML tags and dangerous schemes; cap length."""
    if not isinstance(val, str):
        return None
    val = _HTML_RE.sub("", val)
    val = re.sub(r"(?i)(javascript|vbscript|data)\s*:", "", val)
    val = re.sub(r"(?i)(on\w+)\s*=", "", val)
    val = val.strip()[:max_len]
    return val or None


def _sanitize(data: dict) -> dict:
    """Validate every field from the AI response against strict rules."""
    merchant = _safe_str(data.get("merchant"))

    try:
        amount = round(float(data["amount"]), 2)
        if not (0.01 <= amount <= 999_999):
            amount = None
    except (TypeError, ValueError, KeyError):
        amount = None

    cur = (data.get("currency") or "").strip().upper()
    currency = cur if cur in _CURRENCIES else "USD"

    d = data.get("date")
    date_val = d if isinstance(d, str) and _DATE_RE.match(d) else None

    t = data.get("time")
    time_val = t if isinstance(t, str) and _TIME_RE.match(t) else None

    cat = data.get("category")
    category = cat if cat in _CATEGORIES else None

    pm = data.get("payment_method")
    payment_method = pm if pm in _PAYMENTS else None

    return {
        "merchant":       merchant,
        "amount":         amount,
        "currency":       currency,
        "date":           date_val,
        "time":           time_val,
        "category":       category,
        "payment_method": payment_method,
    }


def _parse_json(text: str) -> Optional[dict]:
    """Extract JSON from AI response, handle markdown fences."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{[\s\S]*?\}", text)
    if m:
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            pass
    return None


def _build(data: dict, confidence: float, raw_text: str = "") -> ParsedInvoice:
    safe = _sanitize(data)
    return ParsedInvoice(raw_text=raw_text, confidence=confidence, **safe)


# Provider availability

def _has_gemini() -> bool:
    return bool(settings.GEMINI_API_KEY)

def _has_openai() -> bool:
    return bool(settings.OPENAI_API_KEY)


# Raw provider calls (new google-genai SDK)

def _gemini_client() -> genai.Client:
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _gemini_vision(image_bytes: bytes, mime_type: str, prompt: str) -> str:
    client = _gemini_client()
    image_part = genai_types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[image_part, prompt],
    )
    return response.text


def _gemini_text(prompt: str) -> str:
    client = _gemini_client()
    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=prompt,
    )
    return response.text


def _openai_vision(image_bytes: bytes, mime_type: str, prompt: str) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    b64 = base64.b64encode(image_bytes).decode()
    resp = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64}"}},
            {"type": "text", "text": prompt},
        ]}],
        max_tokens=512,
    )
    return resp.choices[0].message.content


def _openai_text(prompt: str) -> str:
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    resp = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=512,
    )
    return resp.choices[0].message.content


def _ensure_vision_mime(image_bytes: bytes, mime_type: str) -> tuple[bytes, str]:
    """Gemini Vision only accepts jpeg/png/gif/webp — convert others to PNG."""
    if mime_type in {"image/jpeg", "image/png", "image/gif", "image/webp"}:
        return image_bytes, mime_type
    buf = io.BytesIO()
    Image.open(io.BytesIO(image_bytes)).convert("RGB").save(buf, format="PNG")
    return buf.getvalue(), "image/png"


# Public API

def extract_raw_text(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """
    Transcribe visible text from an image (used by /extract endpoint).
    Returns {"raw_text": str, "confidence": float}.
    """
    image_bytes, mime_type = _ensure_vision_mime(image_bytes, mime_type)
    if _has_gemini():
        try:
            text = _gemini_vision(image_bytes, mime_type, RAW_TEXT_PROMPT)
            return {"raw_text": text.strip(), "confidence": 0.92}
        except Exception as e:
            logger.warning("Gemini extract_raw_text: %s", e)
    if _has_openai():
        try:
            text = _openai_vision(image_bytes, mime_type, RAW_TEXT_PROMPT)
            return {"raw_text": text.strip(), "confidence": 0.88}
        except Exception as e:
            logger.warning("OpenAI extract_raw_text: %s", e)
    return {"raw_text": "", "confidence": 0.0}


def parse_invoice_from_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> ParsedInvoice:
    """
    Extract structured invoice fields from an image.
    Gemini primary → OpenAI fallback → RuntimeError if neither configured.
    """
    image_bytes, mime_type = _ensure_vision_mime(image_bytes, mime_type)

    if _has_gemini():
        try:
            raw = _gemini_vision(image_bytes, mime_type, IMAGE_PROMPT)
            data = _parse_json(raw) or {}
            return _build(data, confidence=0.92)
        except Exception as e:
            logger.warning("Gemini parse_invoice_from_image: %s", e)

    if _has_openai():
        try:
            raw = _openai_vision(image_bytes, mime_type, IMAGE_PROMPT)
            data = _parse_json(raw) or {}
            return _build(data, confidence=0.88)
        except Exception as e:
            logger.warning("OpenAI parse_invoice_from_image: %s", e)

    raise RuntimeError(
        "OCR servisi yapılandırılmamış. .env dosyasına GEMINI_API_KEY veya OPENAI_API_KEY ekleyin."
    )


def parse_invoice_from_text(raw_text: str) -> ParsedInvoice:
    """
    Extract structured invoice fields from plain text (text-based PDFs).
    Gemini primary → OpenAI fallback → RuntimeError if neither configured.
    """
    prompt = TEXT_PROMPT + raw_text[:4000]

    if _has_gemini():
        try:
            raw = _gemini_text(prompt)
            data = _parse_json(raw) or {}
            return _build(data, confidence=0.90, raw_text=raw_text)
        except Exception as e:
            logger.warning("Gemini parse_invoice_from_text: %s", e)

    if _has_openai():
        try:
            raw = _openai_text(prompt)
            data = _parse_json(raw) or {}
            return _build(data, confidence=0.87, raw_text=raw_text)
        except Exception as e:
            logger.warning("OpenAI parse_invoice_from_text: %s", e)

    raise RuntimeError(
        "OCR servisi yapılandırılmamış. .env dosyasına GEMINI_API_KEY veya OPENAI_API_KEY ekleyin."
    )
