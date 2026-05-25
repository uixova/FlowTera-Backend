import re
from typing import Optional

CURRENCY_MAP = {
    "₺": "TRY", "tl": "TRY", "try": "TRY", "türk lirası": "TRY",
    "$": "USD",  "usd": "USD", "dolar": "USD", "dollar": "USD",
    "€": "EUR",  "eur": "EUR", "euro": "EUR",
    "£": "GBP",  "gbp": "GBP", "sterlin": "GBP", "pound": "GBP",
    "¥": "JPY",  "jpy": "JPY", "yen": "JPY",
    "₣": "CHF",  "chf": "CHF", "franc": "CHF",
}

# Priority-ordered total patterns — highest confidence labels first.
# Tuple: (pattern, anchor_start)
#   anchor_start=True  → the keyword must be the leading token of the line
#                        (prevents matching "item amount" or "sub total breakdown")
#   anchor_start=False → multi-word compound labels unlikely to appear in descriptions
TOTAL_PRIORITY: list[tuple[re.Pattern, bool]] = [
    (re.compile(r"genel\s+toplam",             re.IGNORECASE), False),
    (re.compile(r"grand\s+total",              re.IGNORECASE), False),
    (re.compile(r"kdv(?:'?li)?\s+tutar",       re.IGNORECASE), False),
    (re.compile(r"toplam\s+tutar",             re.IGNORECASE), False),
    (re.compile(r"amount\s+due",               re.IGNORECASE), False),
    (re.compile(r"total\s+due",                re.IGNORECASE), False),
    (re.compile(r"total\s+amount",             re.IGNORECASE), False),
    (re.compile(r"\btoplam\b",                 re.IGNORECASE), True),
    (re.compile(r"\btutar\b",                  re.IGNORECASE), True),
    # "AMOUNT" as a standalone label (before bare "TOTAL") catches many English receipts
    (re.compile(r"\bamount\b",                 re.IGNORECASE), True),
    (re.compile(r"\bbalance\b",                re.IGNORECASE), True),
    # Negative lookbehind prevents matching the "total" part of "sub-total"
    (re.compile(r"(?<![-_])\btotal\b",         re.IGNORECASE), True),
    (re.compile(r"\bdue\b",                    re.IGNORECASE), True),
    (re.compile(r"\bpay(?:able)?\b",           re.IGNORECASE), True),
    # Sub-totals and taxes — always lowest priority
    (re.compile(r"ara\s+toplam",               re.IGNORECASE), False),
    (re.compile(r"sub-?total",                 re.IGNORECASE), True),
    (re.compile(r"sales\s+tax|kdv\b|vat\b",   re.IGNORECASE), True),
]

# Lines that are clearly reference/ID lines, never financial totals.
# These are stripped before amount scanning to prevent false picks
# (e.g. "Approval Code #123456" or "Transaction ID: 987654").
_SKIP_AMOUNT_LINE = re.compile(
    r"(?i)\b("
    r"approval|auth(?:orization)?"
    r"|reference|ref(?:\s*no)?"
    r"|order\s*(?:id|no|#)"
    r"|trans(?:action)?\s*(?:id|no|#)"
    r"|voucher|serial|barcode|trace\s*no"
    r"|receipt\s*(?:id|no|#)"
    r"|invoice\s*(?:id|no|#)"
    r"|fi[sş]\s*no|belge\s*no"
    r")\b"
)

# Decimal number: handles Turkish (1.234,56) and English (1,234.56 / 84.80 / 16.5)
# \d{1,2} at end so single-decimal amounts like "16.5" are also matched.
DECIMAL_RE = re.compile(
    r"\b\d{1,3}(?:[.,]\d{3})*[.,]\d{1,2}\b|\b\d+[.,]\d{1,2}\b"
)

# Fallback: plain integers up to 6 digits (used only as last resort)
INTEGER_RE = re.compile(r"\b\d{1,6}\b")

# Tesseract-split decimals: "84 80" or "84. 80" → 84.80
SPLIT_DECIMAL_RE = re.compile(r"(\d+)[.,]?\s+(\d{2})(?=\s|$)")


def _parse_number(raw: str) -> Optional[float]:
    """Parse '1.234,56', '1,234.56', '84.80', '84,80', '16.5' into a float."""
    raw = raw.strip()
    if re.search(r"\d\.\d{3},\d{1,2}$", raw):
        # Turkish: period = thousands, comma = decimal
        raw = raw.replace(".", "").replace(",", ".")
    elif re.search(r"\d,\d{3}\.\d{1,2}$", raw):
        # English: comma = thousands, period = decimal
        raw = raw.replace(",", "")
    elif "," in raw and "." not in raw:
        raw = raw.replace(",", ".")
    try:
        return float(raw)
    except ValueError:
        return None


def _is_start_anchored(m: re.Match, line: str) -> bool:
    """
    True when the pattern is effectively the leading label of the line.
    Allows a bare numeric prefix (e.g. '11 BALANCE DUE') — that's a line/item
    counter, not part of the label itself.
    """
    prefix = line[:m.start()].strip()
    return not prefix or bool(re.fullmatch(r"\d+\.?", prefix))


# Classify CURRENCY_MAP tokens by matching strategy
_CURRENCY_SYMBOLS  = frozenset({"₺", "$", "€", "£", "¥", "₣"})          # unique glyphs
_CURRENCY_CODES    = frozenset({"tl", "try", "usd", "eur", "gbp", "jpy", "chf"})  # abbreviations
# everything else is a word/phrase handled with simple substring-in-lower


def detect_currency(text: str) -> Optional[str]:
    """
    Detect currency from OCR text using three passes.

    Pass 1 — unique symbols (£, €, $, ₺ …): safe substring match because these
              glyphs don't appear inside regular words.
    Pass 2 — short uppercase codes (USD, GBP, TRY …): regex word-boundary match
              to prevent false positives, e.g. 'OATLY' contains 'tl' → TRY would
              fire incorrectly with a bare substring check.
    Pass 3 — word-form names (pound, dollar, euro …): case-insensitive substring.
    """
    # Pass 1: symbol glyphs
    for token, code in CURRENCY_MAP.items():
        if token in _CURRENCY_SYMBOLS and token in text:
            return code

    # Pass 2: abbreviation codes — word boundary required
    for token, code in CURRENCY_MAP.items():
        if token in _CURRENCY_CODES:
            if re.search(r"(?i)\b" + re.escape(token) + r"\b", text):
                return code

    # Pass 3: long word/phrase tokens
    lower = text.lower()
    for token, code in CURRENCY_MAP.items():
        if token not in _CURRENCY_SYMBOLS and token not in _CURRENCY_CODES:
            if token in lower:
                return code

    return None


def detect_amount(text: str) -> Optional[float]:
    """
    Extract the final payable amount from receipt text.

    Strategy:
    1. Remove lines that are clearly reference/approval codes.
    2. For each priority label pattern (highest confidence first), scan
       lines from BOTTOM to TOP — payable totals appear near the receipt end.
    3. For generic single-word labels (anchor_start=True) the keyword must
       be the leading token on the line, preventing matches inside item
       descriptions like "item amount" or "remaining balance note".
    4. On a matching line, prefer the rightmost proper decimal number
       (amounts are right-aligned on receipts).
    5. Fallback: reconstruct Tesseract-split decimals ("84 80" → 84.80).
    6. Final fallback: largest decimal in the filtered text.
    7. Last resort: largest integer, excluding years.
    """
    lines = text.splitlines()

    # Remove reference/ID lines that can never be the payable total
    usable = [ln for ln in lines if not _SKIP_AMOUNT_LINE.search(ln)]

    for pattern, anchor in TOTAL_PRIORITY:
        for line in reversed(usable):   # bottom-to-top: total is near the end
            m = pattern.search(line)
            if not m:
                continue

            # Anchored patterns: keyword must be the first non-space token
            if anchor and not _is_start_anchored(m, line):
                continue

            # Rightmost decimal — right-aligned on receipt
            decimal_matches = list(DECIMAL_RE.finditer(line))
            if decimal_matches:
                val = _parse_number(decimal_matches[-1].group())
                if val is not None and val > 0:
                    return val

            # Reconstruct Tesseract-split decimal on matched line
            split = SPLIT_DECIMAL_RE.search(line)
            if split:
                val = _parse_number(f"{split.group(1)}.{split.group(2)}")
                if val is not None and val > 0:
                    return val

    # Fallback: largest decimal anywhere in the usable text
    usable_text = "\n".join(usable)
    candidates = [
        v for m in DECIMAL_RE.finditer(usable_text)
        if (v := _parse_number(m.group())) is not None and 0.01 <= v <= 999_999
    ]
    if candidates:
        return max(candidates)

    # Last resort: largest integer (skip years 1900–2099)
    int_candidates = [
        v for m in INTEGER_RE.finditer(usable_text)
        if not re.fullmatch(r"(19|20)\d{2}", m.group())
        and (v := _parse_number(m.group())) is not None
        and 0.01 <= v <= 999_999
    ]
    return max(int_candidates) if int_candidates else None
