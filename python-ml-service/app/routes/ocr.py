import asyncio
import httpx
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.core.ai_parser import (
    extract_raw_text,
    parse_invoice_from_image,
    parse_invoice_from_text,
)
from app.core.pdf_engine   import extract_from_pdf
from app.schemas.ocr        import OcrExtractResponse, ParsedInvoice
from app.schemas.url_request import OcrFromUrlRequest

router = APIRouter(prefix="/ocr", tags=["OCR"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/tiff", "image/bmp"}
PDF_TYPE            = "application/pdf"
MAX_FILE_BYTES      = 20 * 1024 * 1024  # 20 MB


def _is_pdf_url(url: str) -> bool:
    return url.lower().split("?")[0].endswith(".pdf")


async def _download_url(url: str) -> tuple[bytes, str]:
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        r = await client.get(url)
        r.raise_for_status()
    ct = r.headers.get("content-type", "application/octet-stream").split(";")[0].strip()
    return r.content, ct


def _check_size(data: bytes) -> None:
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(413, f"Dosya {MAX_FILE_BYTES // (1024 * 1024)}MB sınırını aşıyor.")


async def _parse(file_bytes: bytes, ct: str) -> ParsedInvoice:
    """Route bytes to the correct AI parse path."""
    if ct == PDF_TYPE:
        result = await asyncio.to_thread(extract_from_pdf, file_bytes)
        if result["method"] == "text":
            return await asyncio.to_thread(parse_invoice_from_text, result["raw_text"])
        else:
            return await asyncio.to_thread(
                parse_invoice_from_image, result["image_bytes"], result["mime_type"]
            )
    return await asyncio.to_thread(parse_invoice_from_image, file_bytes, ct)


# Endpoints

@router.post("/extract", response_model=OcrExtractResponse)
async def ocr_extract(file: UploadFile = File(...)):
    """Ham metin çıkartma — Gemini Vision kullanır."""
    ct = file.content_type or ""
    if ct not in ALLOWED_IMAGE_TYPES and ct != PDF_TYPE:
        raise HTTPException(400, "Yalnızca görüntü (jpg/png/webp) veya PDF kabul edilir.")

    data = await file.read()
    _check_size(data)

    if ct == PDF_TYPE:
        result = await asyncio.to_thread(extract_from_pdf, data)
        if result["method"] == "text":
            return OcrExtractResponse(raw_text=result["raw_text"], confidence=result["confidence"])
        raw = await asyncio.to_thread(extract_raw_text, result["image_bytes"], result["mime_type"])
    else:
        raw = await asyncio.to_thread(extract_raw_text, data, ct)

    return OcrExtractResponse(raw_text=raw["raw_text"], confidence=raw["confidence"])


@router.post("/parse-invoice", response_model=ParsedInvoice)
async def parse_invoice_endpoint(file: UploadFile = File(...)):
    """
    Fatura/fiş görüntüsü veya PDF'inden yapılandırılmış harcama verisi çıkarır.
    Gemini 1.5 Flash → OpenAI GPT-4o-mini fallback.
    """
    ct = file.content_type or ""
    if ct not in ALLOWED_IMAGE_TYPES and ct != PDF_TYPE:
        raise HTTPException(400, "Yalnızca görüntü veya PDF kabul edilir.")

    data = await file.read()
    _check_size(data)

    try:
        return await _parse(data, ct)
    except RuntimeError as e:
        raise HTTPException(503, str(e))


@router.post("/extract-from-url", response_model=ParsedInvoice)
async def ocr_from_url(body: OcrFromUrlRequest):
    """S3 veya presigned URL'den dosyayı indir ve faturayı ayrıştır."""
    try:
        data, ct = await _download_url(body.url)
    except httpx.HTTPStatusError as e:
        raise HTTPException(400, f"Dosya indirilemedi: {e.response.status_code}")
    except httpx.RequestError as e:
        raise HTTPException(400, f"Bağlantı hatası: {str(e)}")

    if ct == "application/octet-stream" and _is_pdf_url(body.url):
        ct = PDF_TYPE

    _check_size(data)

    try:
        return await _parse(data, ct)
    except RuntimeError as e:
        raise HTTPException(503, str(e))
