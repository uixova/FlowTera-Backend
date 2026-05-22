from pydantic import BaseModel
from typing import Optional

class OcrExtractResponse(BaseModel):
    raw_text: str
    language: Optional[str] = None
    confidence: Optional[float] = None

class ParsedInvoice(BaseModel):
    merchant:   Optional[str]   = None
    amount:     Optional[float] = None
    currency:   Optional[str]   = None
    date:       Optional[str]   = None
    category:   Optional[str]   = None
    raw_text:   str             = ""
    confidence: float           = 0.0
