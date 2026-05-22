import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.core.ocr_engine import extract_text
from app.core.invoice_parser import parse_invoice
from app.schemas.ocr import OcrExtractResponse, ParsedInvoice

router = APIRouter(prefix="/ocr", tags=["OCR"])

@router.post("/extract", response_model=OcrExtractResponse)
async def ocr_extract(file: UploadFile = File(...)):
    """Yüklenen görüntüden ham metin çıkarır."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Yalnızca görüntü dosyaları kabul edilir.")
    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Dosya 10MB sınırını aşıyor.")
    # extract_text CPU-bound sync — thread pool'da çalıştır, async event loop'u bloklamaz
    result = await asyncio.to_thread(extract_text, image_bytes)
    return OcrExtractResponse(raw_text=result["raw_text"], confidence=result["confidence"])

@router.post("/parse-invoice", response_model=ParsedInvoice)
async def parse_invoice_endpoint(file: UploadFile = File(...)):
    """Fatura/fiş görüntüsünden yapılandırılmış harcama verisi çıkarır."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Yalnızca görüntü dosyaları kabul edilir.")
    image_bytes = await file.read()
    # Her iki CPU işlemi de thread pool'da — extract + parse zinciri
    result  = await asyncio.to_thread(extract_text, image_bytes)
    invoice = await asyncio.to_thread(parse_invoice, result["raw_text"], result["confidence"])
    return invoice
