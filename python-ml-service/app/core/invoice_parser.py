import re
from typing import Optional
from datetime import datetime
from app.core.currency_detector import detect_currency, detect_amount
from app.core.category_engine import categorize
from app.schemas.ocr import ParsedInvoice

# Date extraction

DATE_PATTERNS = [
    (r"\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b", "dmy"),
    (r"\b(\d{4})[./-](\d{1,2})[./-](\d{1,2})\b", "ymd"),
    (r"\b(\d{1,2})[./-](\d{1,2})[./-](\d{2})\b",  "dmy2"),
]

MONTH_NAMES: dict[str, int] = {
    "ocak": 1, "şubat": 2, "mart": 3, "nisan": 4, "mayıs": 5, "haziran": 6,
    "temmuz": 7, "ağustos": 8, "eylül": 9, "ekim": 10, "kasım": 11, "aralık": 12,
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

DATE_TEXT_RE = re.compile(
    r"\b(\d{1,2})\s+(" + "|".join(MONTH_NAMES.keys()) + r")\s+(\d{4})\b",
    re.IGNORECASE,
)

# Matches compact forms: "21JUL2022", "05-OCT-18", "21/JUL/2022"
# Month abbreviations sorted longest-first to avoid partial matches.
_MONTH_PAT = "|".join(sorted(MONTH_NAMES.keys(), key=len, reverse=True))
DATE_COMPACT_RE = re.compile(
    r"\b(\d{1,2})[.\-/]?(" + _MONTH_PAT + r")[.\-/]?(\d{2,4})\b",
    re.IGNORECASE,
)

# Strip date/time label prefix before parsing (e.g. "Date: 01-01-2024 10:35")
DATE_LABEL_RE = re.compile(r"(?i)(?:tarih|date|dt)[:\s]+(.+)")


def _extract_date(text: str) -> Optional[str]:
    # Try natural language date: "15 Ocak 2024"
    m = DATE_TEXT_RE.search(text)
    if m:
        day   = int(m.group(1))
        month = MONTH_NAMES[m.group(2).lower()]
        year  = int(m.group(3))
        try:
            return datetime(year, month, day).strftime("%Y-%m-%d")
        except ValueError:
            pass

    # Try compact date without spaces: "21JUL2022", "05-OCT-18"
    m = DATE_COMPACT_RE.search(text)
    if m:
        day   = int(m.group(1))
        month = MONTH_NAMES[m.group(2).lower()]
        raw_y = int(m.group(3))
        year  = 2000 + raw_y if raw_y < 100 else raw_y
        try:
            return datetime(year, month, day).strftime("%Y-%m-%d")
        except ValueError:
            pass

    # Parse labeled date lines first (more reliable than scanning full text)
    labeled: list[str] = []
    all_lines = text.splitlines()
    for line in all_lines:
        ml = DATE_LABEL_RE.match(line)
        if ml:
            labeled.insert(0, ml.group(1))

    for src in labeled + all_lines:
        for pattern, order in DATE_PATTERNS:
            m = re.search(pattern, src)
            if not m:
                continue
            g = [int(x) for x in m.groups()]
            try:
                if order == "ymd":
                    dt = datetime(g[0], g[1], g[2])
                elif order == "dmy2":
                    year = 2000 + g[2] if g[2] < 100 else g[2]
                    dt   = datetime(year, g[1], g[0])
                else:
                    dt   = datetime(g[2], g[1], g[0])
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue

    return None


# Time extraction

# Matches HH:MM and HH:MM:SS (24-hour or 12-hour with optional am/pm)
TIME_RE = re.compile(
    r"\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?(?:\s*[AaPp][Mm])?\b"
)

# Strip time label prefix (e.g. "Saat: 09:22" or "Time: 10:35")
TIME_LABEL_RE = re.compile(r"(?i)(?:saat|time|zaman)[:\s]+(.+)")


def _extract_time(text: str) -> Optional[str]:
    # Prefer labeled time lines
    for line in text.splitlines():
        ml = TIME_LABEL_RE.match(line)
        if ml:
            m = TIME_RE.search(ml.group(1))
            if m:
                return f"{m.group(1).zfill(2)}:{m.group(2)}"

    # Scan full text — skip lines that look purely like date patterns
    for line in text.splitlines():
        # Avoid picking up the date portion from "01-01-2018 10:35"
        # by searching only if a colon separates two digit groups
        m = TIME_RE.search(line)
        if m:
            hour, minute = int(m.group(1)), int(m.group(2))
            if 0 <= hour <= 23 and 0 <= minute <= 59:
                return f"{str(hour).zfill(2)}:{str(minute).zfill(2)}"

    return None

# Merchant extraction

# Positive: lines that label the merchant/store explicitly.
# Capture group 1 is the merchant value after the colon/slash.
MERCHANT_LABEL_RE = re.compile(
    r"(?i)(?:satici|yer|merchant|store\s*name|shop\s*name|işyeri|firma|vendor|supplier)[:\s/]+(.+)"
)

# Lines that start with these tokens are NOT the merchant name
SKIP_MERCHANT_LINE_RE = re.compile(
    r"""(?xi)^\s*(
        adres[s]?[:\s] | address[:\s] | addr[:\s] |
        sokak[:\s] | cadde[:\s] | mah[.\s] | mahalle[:\s] |
        tel\w{0,2}[.:\s] | telefon[:\s] | faks?[:\s] | fax[:\s] | phone[:\s] |
        gsm[:\s] | mobile[:\s] | cel[l]?[:\s] |
        web[:\s] | www\. | https?:// | e-?mail[:\s] |
        fis\s*no | fiş\s*no | makbuz\s*no | belge\s*no |
        receipt\s*[\#no] | invoice\s*[\#no] | order\s*[\#no] |
        seri[:\s] | serial[:\s] |
        tarih[:\s] | date[:\s] | dt[:\s] | saat[:\s] | time[:\s] |
        kdv | vat | vergi | tax\b | indirim | discount |
        sub-?total | subtotal | ara\s*toplam |
        genel\s*toplam | grand\s+total |
        total[:\s] | amount[:\s] | toplam[:\s] | tutar[:\s] | balance[:\s] | due[:\s] |
        ürün | ürün\s*adı | item[:\s] | product[:\s] | description[:\s] | açıklama[:\s] |
        adet[:\s] | qty[:\s] | quantity[:\s] | miktar[:\s] |
        fiyat[:\s] | price[:\s] | birim[:\s] | unit[:\s]
    )""",
    re.IGNORECASE | re.VERBOSE,
)

# Item rows: "ProductName   12.50" or "Lorem  1.1" or "Tax   8 00" (Tesseract split decimal)
ITEM_ROW_RE = re.compile(r"^.{2,40}\s+(?:\d+[.,]\d{1,2}|\d+\s+\d{2})\s*$")

# Generic document-type labels that must not be treated as merchant names.
# Do NOT include "store", "shop", "market" — real merchant names contain these words
# (e.g. "MAIN STREET SHOP" is a valid merchant, not a label misread).
GENERIC_LABELS = frozenset([
    "receipt", "fis", "fatura", "makbuz", "belge",
    "invoice", "bill", "slip", "voucher", "order", "siparis",
])


def _levenshtein(a: str, b: str) -> int:
    """Compute edit distance between two strings."""
    if not a:
        return len(b)
    if not b:
        return len(a)
    dp = list(range(len(b) + 1))
    for c1 in a:
        ndp = [dp[0] + 1]
        for j, c2 in enumerate(b):
            ndp.append(min(dp[j] + (0 if c1 == c2 else 1), ndp[-1] + 1, dp[j + 1] + 1))
        dp = ndp
    return dp[-1]


def _ascii_normalize(s: str) -> str:
    """Normalize Turkish characters and strip non-alpha for fuzzy matching."""
    s = s.lower()
    for tr, en in [("ı","i"),("ğ","g"),("ü","u"),("ş","s"),("ö","o"),("ç","c")]:
        s = s.replace(tr, en)
    return re.sub(r"[^a-z]", "", s)


def _is_label_misread(text: str) -> bool:
    """
    Return True when a short single-token string is an OCR misread of a
    generic document label (e.g. 'Reoeı'f:-' is a garbled read of 'Receipt').
    Uses Levenshtein similarity against known generic labels.
    Only applied to short inputs to avoid false positives on real names.
    """
    words = text.split()
    if len(words) > 2:
        return False  # multi-word strings are almost certainly real names

    norm = _ascii_normalize(text)
    if not (3 <= len(norm) <= 12):
        return False

    for label in GENERIC_LABELS:
        label_norm = _ascii_normalize(label)
        max_len = max(len(norm), len(label_norm))
        if max_len == 0:
            continue
        dist = _levenshtein(norm, label_norm)
        if dist / max_len < 0.40:   # strict: only near-exact garbles, not partial word matches
            return True
    return False


# Characters valid at the end of a merchant name
_CLEAN_START = re.compile(r"^[^\wÀ-ɏğüşöçıĞÜŞÖÇİ]+")
_CLEAN_END   = re.compile(r"[^\wÀ-ɏğüşöçıĞÜŞÖÇİ\s&()]+$")


def _alpha_ratio(s: str) -> float:
    """Fraction of alphanumeric + space characters in string."""
    if not s:
        return 0.0
    return sum(c.isalnum() or c.isspace() for c in s) / len(s)


def _extract_merchant(text: str) -> Optional[str]:
    """
    Scan the receipt for the store/merchant name.

    First checks labeled lines ("Merchant: Starbucks", "Satici: X"), then
    falls back to scanning the first lines of the receipt. Skips address/contact
    lines, financial totals, item rows, OCR garbage, and label misreads.
    """
    # Prefer explicitly labeled merchant lines anywhere in the document
    for line in text.splitlines():
        m = MERCHANT_LABEL_RE.match(line.strip())
        if m:
            value = m.group(1).strip()
            cleaned = _CLEAN_START.sub("", value)
            cleaned = _CLEAN_END.sub("", cleaned).strip()
            if len(cleaned) >= 2 and _alpha_ratio(cleaned) >= 0.45:
                return cleaned[:80]

    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

    for line in lines[:12]:
        # Skip structured label lines
        if SKIP_MERCHANT_LINE_RE.match(line):
            continue

        # Skip pure numeric or symbol-only lines
        if re.fullmatch(r"[\d\s.,:/\-#|*_=]+", line):
            continue

        # Skip item rows (product description + right-aligned price)
        if ITEM_ROW_RE.match(line):
            continue

        # Skip very short strings
        if len(line) < 3:
            continue

        # Skip OCR garbage — less than 45% alphanumeric characters
        if _alpha_ratio(line) < 0.45:
            continue

        # Skip lines whose last word is a generic document-type label.
        # Handles "Receipt", "ELEKTRIK FATURASI", "Tax Invoice", etc.
        words = line.lower().split()
        last  = re.sub(r"(si|sı|si|ler|lar|nın|nin|s)$", "", words[-1]) if words else ""
        if last in GENERIC_LABELS or (len(words) == 1 and words[0].rstrip("s") in GENERIC_LABELS):
            continue

        # Clean OCR noise characters from edges
        cleaned = _CLEAN_START.sub("", line)
        cleaned = _CLEAN_END.sub("", cleaned).strip()

        if len(cleaned) < 3:
            continue

        # Reject Levenshtein-close misreads of generic labels
        if _is_label_misread(cleaned):
            continue

        return cleaned[:80]

    return None

# Payment method extraction

# Normalize OCR-detected payment terms to the values expected by CreateExpense.
_PAYMENT_MAP: list[tuple[re.Pattern, str]] = [
    # Credit card patterns checked first — more specific than bare "card"
    (re.compile(r"\bkredi\s*kart|\bcredit\s*card|\bvisa\b|\bmastercard\b|\bamex\b|\bmaestro\b", re.IGNORECASE), "Credit Card"),
    # Bank card / debit card (UK "bank card" = debit)
    (re.compile(r"\bbanka\s*kart|\bbank\s*card|\bdebit\s*card|\bdebit\b", re.IGNORECASE), "Debit Card"),
    # Bank transfer
    (re.compile(r"\bhavale\b|\beft\b|\bbank\s*transfer|\bbanka\s*trans",  re.IGNORECASE), "Bank Transfer"),
    # Mobile payment
    (re.compile(r"\bmobil\s*öd|\bmobile\s*pay|\bpaypal\b|\bgoogle\s*pay|\bapple\s*pay", re.IGNORECASE), "Mobile Payment"),
    # Check
    (re.compile(r"\bçek\b|\bcheque?\b",                                   re.IGNORECASE), "Check"),
    # Cash — last: negative lookahead prevents "CASH RECEIPT" document title from firing
    (re.compile(r"\bnakit\b|\bcash(?!\s*receipt)\b",                      re.IGNORECASE), "Cash"),
]

_PAYMENT_LABEL_RE = re.compile(
    r"(?i)(?:ödeme\s*yöntem[i]?|ödeme\s*şekl[i]?|payment\s*method|payment\s*type|paid\s*by|paid\s*via)[:\s]+(.+)"
)


def _extract_payment_method(text: str) -> Optional[str]:
    # Labeled lines are highest confidence: "Ödeme Yöntemi: Kredi Kartı"
    for line in text.splitlines():
        m = _PAYMENT_LABEL_RE.match(line.strip())
        if m:
            val = m.group(1).strip()
            for pattern, method in _PAYMENT_MAP:
                if pattern.search(val):
                    return method

    # Line-by-line keyword scan — skip document-title lines (e.g. "CASH RECEIPT")
    # to prevent the document type from being misread as payment method.
    _DOC_TITLE_RE = re.compile(r"(?i)\b(receipt|fatura|invoice|makbuz|slip)\b")
    for line in text.splitlines():
        if _DOC_TITLE_RE.search(line):
            continue  # document-type line, not a payment line
        for pattern, method in _PAYMENT_MAP:
            if pattern.search(line):
                return method

    return None

# Main parser

def parse_invoice(raw_text: str, confidence: float = 0.0) -> ParsedInvoice:
    amount         = detect_amount(raw_text)
    currency       = detect_currency(raw_text)
    date           = _extract_date(raw_text)
    time           = _extract_time(raw_text)
    merchant       = _extract_merchant(raw_text)
    category       = categorize(raw_text)
    payment_method = _extract_payment_method(raw_text)

    return ParsedInvoice(
        merchant=merchant,
        amount=amount,
        currency=currency or "USD",  # no symbol detected → default USD
        date=date,
        time=time,
        category=category,
        payment_method=payment_method,
        raw_text=raw_text,
        confidence=confidence,
    )
