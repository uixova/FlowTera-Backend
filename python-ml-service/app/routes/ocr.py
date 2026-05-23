import asyncio
import httpx
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.core.ocr_engine import extract_text
from app.core.pdf_engine import extract_from_pdf
from app.core.invoice_parser import parse_invoice
from app.schemas.ocr import OcrExtractResponse, ParsedInvoice
from app.schemas.url_request import OcrFromUrlRequest

router = APIRouter(prefix="/ocr", tags=["OCR"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/tiff", "image/bmp"}
PDF_TYPE            = "application/pdf"
MAX_FILE_BYTES      = 20 * 1024 * 1024  # 20MB

def _is_pdf_url(url: str) -> bool:
    return url.lower().split("?")[0].endswith(".pdf")

async def _download_url(url: str) -> tuple[bytes, str]:
    """URL'den dosya indir. (bytes, content_type) döner."""
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        response = await client.get(url)
        response.raise_for_status()
    content_type = response.headers.get("content-type", "application/octet-stream").split(";")[0].strip()
    return response.content, content_type

async def _process_bytes(file_bytes: bytes, content_type: str) -> dict:
    """Dosya türüne göre metin çıkarır."""
    if len(file_bytes) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail=f"Dosya {MAX_FILE_BYTES // (1024*1024)}MB sınırını aşıyor.")

    if content_type == PDF_TYPE:
        return await asyncio.to_thread(extract_from_pdf, file_bytes)
    elif content_type in ALLOWED_IMAGE_TYPES or content_type.startswith("image/"):
        return await asyncio.to_thread(extract_text, file_bytes)
    else:
        raise HTTPException(status_code=415, detail=f"Desteklenmeyen dosya türü: {content_type}")

@router.post("/extract", response_model=OcrExtractResponse)
async def ocr_extract(file: UploadFile = File(...)):
    """Yüklenen görüntü veya PDF'den ham metin çıkarır."""
    ct = file.content_type or ""
    if ct not in ALLOWED_IMAGE_TYPES and ct != PDF_TYPE:
        raise HTTPException(status_code=400, detail="Yalnızca görüntü (jpg/png/webp) veya PDF kabul edilir.")
    file_bytes = await file.read()
    result = await _process_bytes(file_bytes, ct)
    return OcrExtractResponse(raw_text=result["raw_text"], confidence=result["confidence"])

@router.post("/parse-invoice", response_model=ParsedInvoice)
async def parse_invoice_endpoint(file: UploadFile = File(...)):
    """Fatura/fiş görüntüsü veya PDF'inden yapılandırılmış harcama verisi çıkarır."""
    ct = file.content_type or ""
    if ct not in ALLOWED_IMAGE_TYPES and ct != PDF_TYPE:
        raise HTTPException(status_code=400, detail="Yalnızca görüntü veya PDF kabul edilir.")
    file_bytes = await file.read()
    result  = await _process_bytes(file_bytes, ct)
    invoice = await asyncio.to_thread(parse_invoice, result["raw_text"], result["confidence"])
    return invoice

@router.post("/extract-from-url", response_model=ParsedInvoice)
async def ocr_from_url(body: OcrFromUrlRequest):
    """S3 veya presigned URL'den dosyayı indir, OCR uygula ve faturayı ayrıştır."""
    try:
        file_bytes, content_type = await _download_url(body.url)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=400, detail=f"Dosya indirilemedi: {e.response.status_code}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Bağlantı hatası: {str(e)}")

    # URL uzantısından PDF tespiti (content-type güvenilmez olabilir)
    if content_type == "application/octet-stream" and _is_pdf_url(body.url):
        content_type = PDF_TYPE

    result  = await _process_bytes(file_bytes, content_type)
    invoice = await asyncio.to_thread(parse_invoice, result["raw_text"], result["confidence"])
    return invoice
