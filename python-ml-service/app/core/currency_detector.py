import re
from typing import Optional

CURRENCY_MAP = {
    "₺": "TRY", "tl": "TRY", "try": "TRY", "türk lirası": "TRY",
    "$": "USD",  "usd": "USD", "dolar": "USD",
    "€": "EUR",  "eur": "EUR", "euro": "EUR",
    "£": "GBP",  "gbp": "GBP", "sterlin": "GBP",
}

# Toplam satırı öncelik sırası (yüksek → düşük)
# Ayrı listede tutulur, her grup ayrı regex ile aranır
TOTAL_PRIORITY = [
    re.compile(r"genel\s+toplam", re.IGNORECASE),
    re.compile(r"kdv(?:'?li)?\s+tutar", re.IGNORECASE),
    re.compile(r"toplam\s+tutar", re.IGNORECASE),
    re.compile(r"\btoplam\b", re.IGNORECASE),
    re.compile(r"\btutar\b", re.IGNORECASE),
    re.compile(r"\btotal\b", re.IGNORECASE),
    # ara toplam son sırada — alt toplam, gerçek ödeme değil
    re.compile(r"ara\s+toplam", re.IGNORECASE),
]

# Sayı deseni: 1.234,56 | 1,234.56 | 1234.56 | 1234,56
NUMBER_RE = re.compile(r"\b(\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|\d+[.,]\d{2}|\d+)\b")


def _parse_number(raw: str) -> Optional[float]:
    """'1.234,56' veya '1,234.56' gibi formatları float'a çevirir."""
    raw = raw.strip()
    # Türkçe format: nokta binlik, virgül ondalık
    if re.search(r"\d\.\d{3},\d{2}$", raw):
        raw = raw.replace(".", "").replace(",", ".")
    # İngilizce format: virgül binlik, nokta ondalık
    elif re.search(r"\d,\d{3}\.\d{2}$", raw):
        raw = raw.replace(",", "")
    # Tek ayırıcı
    elif "," in raw and "." not in raw:
        raw = raw.replace(",", ".")
    elif "." in raw and "," not in raw:
        pass  # zaten doğru format
    try:
        return float(raw)
    except ValueError:
        return None


def detect_currency(text: str) -> Optional[str]:
    lower = text.lower()
    for token, code in CURRENCY_MAP.items():
        if token in lower:
            return code
    return None


def detect_amount(text: str) -> Optional[float]:
    """
    1. TOPLAM/TUTAR satırlarını öncelik sırasıyla tarar.
    2. Yoksa tüm metindeki en büyük makul sayıyı döner.
    """
    lines = text.splitlines()

    # Öncelik sırasıyla toplam satırlarını tara
    for pattern in TOTAL_PRIORITY:
        for line in lines:
            if pattern.search(line):
                for m in NUMBER_RE.finditer(line):
                    val = _parse_number(m.group())
                    if val is not None and val > 0:
                        return val

    # Toplam bulunamazsa tüm metindeki en büyük makul sayı
    candidates = []
    for m in NUMBER_RE.finditer(text):
        val = _parse_number(m.group())
        if val is not None and 0.01 <= val <= 999_999:
            candidates.append(val)

    return max(candidates) if candidates else None
