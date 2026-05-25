from pydantic import BaseModel
from typing import Optional


class OcrExtractResponse(BaseModel):
    raw_text:   str
    language:   Optional[str]   = None
    confidence: Optional[float] = None


class ParsedInvoice(BaseModel):
    merchant:       Optional[str]   = None
    amount:         Optional[float] = None
    currency:       Optional[str]   = None
    date:           Optional[str]   = None
    time:           Optional[str]   = None   # HH:MM — None when not found on receipt
    category:       Optional[str]   = None
    payment_method: Optional[str]   = None   # Cash / Credit Card / etc. — None when not found
    raw_text:       str             = ""
    confidence:     float           = 0.0
