import re
from typing import Optional

# Para birimi sembolleri ve kısaltmaları
CURRENCY_MAP = {
    "₺": "TRY", "tl": "TRY", "try": "TRY", "türk lirası": "TRY",
    "$": "USD",  "usd": "USD", "dolar": "USD",
    "€": "EUR",  "eur": "EUR", "euro": "EUR",
    "£": "GBP",  "gbp": "GBP", "sterlin": "GBP",
}

AMOUNT_PATTERN = re.compile(
    r"(?P<sym>[₺$€£])?\s*(?P<amount>\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?P<code>TRY|USD|EUR|GBP|TL)?",
    re.IGNORECASE,
)

def detect_currency(text: str) -> Optional[str]:
    lower = text.lower()
    for token, code in CURRENCY_MAP.items():
        if token in lower:
            return code
    return None

def detect_amount(text: str) -> Optional[float]:
    """Metinden para miktarını bulur."""
    for m in AMOUNT_PATTERN.finditer(text):
        raw = m.group("amount").replace(".", "").replace(",", ".")
        try:
            return float(raw)
        except ValueError:
            continue
    return None
