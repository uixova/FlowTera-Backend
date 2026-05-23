import asyncio
import fitz  # pymupdf
from app.core.ocr_engine import extract_text

def extract_from_pdf(pdf_bytes: bytes) -> dict:
    """
    PDF'ten metin çıkarır.
    1. Metin tabanlı PDF → doğrudan metin al (hızlı, ~95% güven)
    2. Taranan PDF → her sayfayı görüntüye çevir + OCR (yavaş, ~70% güven)
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page_count = len(doc)

    # Metin tabanlı PDF dene
    full_text = ""
    for page in doc:
        full_text += page.get_text("text") + "\n"

    doc.close()

    if full_text.strip():
        return {
            "raw_text":  full_text.strip(),
            "confidence": 95.0,
            "pages":     page_count,
            "method":    "text",
        }

    # Taranan PDF — her sayfayı 2x zoom PNG'e çevir → OCR
    doc2 = fitz.open(stream=pdf_bytes, filetype="pdf")
    page_texts = []
    for page in doc2:
        mat = fitz.Matrix(2.0, 2.0)  # 2x zoom — OCR kalitesini artırır
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("png")
        result = extract_text(img_bytes)
        if result["raw_text"].strip():
            page_texts.append(result["raw_text"])
    doc2.close()

    return {
        "raw_text":  "\n---\n".join(page_texts),
        "confidence": 70.0 if page_texts else 0.0,
        "pages":     page_count,
        "method":    "ocr",
    }
