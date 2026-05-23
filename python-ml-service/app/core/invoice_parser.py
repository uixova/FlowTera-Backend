import re
from typing import Optional
from datetime import datetime
from app.core.currency_detector import detect_currency, detect_amount
from app.core.category_engine import categorize
from app.schemas.ocr import ParsedInvoice

# Tarih desenleri: DD.MM.YYYY, YYYY-MM-DD, DD/MM/YYYY, D MMM YYYY (Türkçe+İngilizce)
DATE_PATTERNS = [
    (r"\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b", "dmy"),
    (r"\b(\d{4})[./-](\d{1,2})[./-](\d{1,2})\b", "ymd"),
]

TR_MONTHS = {
    "ocak": 1, "şubat": 2, "mart": 3, "nisan": 4, "mayıs": 5, "haziran": 6,
    "temmuz": 7, "ağustos": 8, "eylül": 9, "ekim": 10, "kasım": 11, "aralık": 12,
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
}

DATE_TEXT_RE = re.compile(
    r"\b(\d{1,2})\s+(" + "|".join(TR_MONTHS.keys()) + r")\s+(\d{4})\b",
    re.IGNORECASE,
)

# Merchant için atlanacak satırlar
SKIP_MERCHANT_RE = re.compile(
    r"^\s*(\d+|tarih|date|saat|time|fiş|fis|belge|makbuz|receipt|no[.:]|tel[.:]|adres|address)\b",
    re.IGNORECASE,
)


def _extract_date(text: str) -> Optional[str]:
    # Metin tabanlı tarih: "15 Ocak 2024"
    m = DATE_TEXT_RE.search(text)
    if m:
        day, month_str, year = int(m.group(1)), TR_MONTHS[m.group(2).lower()], int(m.group(3))
        try:
            return datetime(year, month_str, day).strftime("%Y-%m-%d")
        except ValueError:
            pass

    # Sayısal tarih desenleri
    for pattern, order in DATE_PATTERNS:
        m = re.search(pattern, text)
        if not m:
            continue
        g = [int(x) for x in m.groups()]
        try:
            if order == "ymd":
                dt = datetime(g[0], g[1], g[2])
            else:
                dt = datetime(g[2], g[1], g[0])
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def _extract_merchant(text: str) -> Optional[str]:
    """
    İlk anlamlı satırı merchant olarak döner.
    Sayısal satırlar, tarih/saat/fiş etiketleri atlanır.
    İlk 5 satır taranır; en uzun anlamlı aday seçilir.
    """
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    candidates = []
    for line in lines[:8]:
        if SKIP_MERCHANT_RE.match(line):
            continue
        if len(line) < 3 or line.replace(" ", "").isdigit():
            continue
        candidates.append(line)
        if len(candidates) >= 3:
            break

    if not candidates:
        return None

    # En uzun aday (genellikle tam firma adı)
    best = max(candidates, key=len)
    return best[:60]


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
