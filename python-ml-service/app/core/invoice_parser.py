import re
from typing import Optional
from datetime import datetime
from app.core.currency_detector import detect_currency, detect_amount
from app.core.category_engine import categorize
from app.schemas.ocr import ParsedInvoice

DATE_PATTERNS = [
    r"\b(\d{2})[./-](\d{2})[./-](\d{4})\b",  # DD.MM.YYYY
    r"\b(\d{4})[./-](\d{2})[./-](\d{2})\b",  # YYYY-MM-DD
]

MERCHANT_STOP = {"ltd", "şti", "a.ş", "inc", "co", "llc", "tic"}

def _extract_date(text: str) -> Optional[str]:
    for pattern in DATE_PATTERNS:
        m = re.search(pattern, text)
        if m:
            g = m.groups()
            try:
                if len(g[0]) == 4:  # YYYY-MM-DD
                    dt = datetime(int(g[0]), int(g[1]), int(g[2]))
                else:               # DD.MM.YYYY
                    dt = datetime(int(g[2]), int(g[1]), int(g[0]))
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
    return None

def _extract_merchant(text: str) -> Optional[str]:
    """İlk satırı merchant adayı olarak alır, çok kısa veya sayısal ise None döner."""
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if not lines:
        return None
    candidate = lines[0]
    if len(candidate) < 3 or candidate.isdigit():
        return None
    return candidate[:50]  # maks 50 karakter

def parse_invoice(raw_text: str, confidence: float = 0.0) -> ParsedInvoice:
    amount   = detect_amount(raw_text)
    currency = detect_currency(raw_text)
    date     = _extract_date(raw_text)
    merchant = _extract_merchant(raw_text)
    category = categorize(raw_text)

    return ParsedInvoice(
        merchant=merchant,
        amount=amount,
        currency=currency or "TRY",
        date=date,
        category=category,
        raw_text=raw_text,
        confidence=confidence,
    )
