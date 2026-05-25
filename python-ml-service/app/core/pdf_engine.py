"""
PDF text extraction.

Text-based PDFs → pdfplumber  (fast, accurate, free — no API call)
Scanned PDFs    → PyMuPDF renders first page as PNG → Gemini Vision in ocr.py
"""
import io

import fitz          # pymupdf — scanned page render
import pdfplumber    # text-based extraction


def extract_from_pdf(pdf_bytes: bytes) -> dict:
    """
    Returns:
        method = "text"    → raw_text populated, image_bytes = None
        method = "scanned" → image_bytes populated (first page PNG), raw_text = ""
    """
    raw_bytes = io.BytesIO(pdf_bytes)

    with pdfplumber.open(raw_bytes) as pdf:
        page_count = len(pdf.pages)
        texts      = [p.extract_text() or "" for p in pdf.pages]

    full_text = "\n".join(texts).strip()

    if full_text:
        return {
            "raw_text":    full_text,
            "confidence":  0.95,
            "pages":       page_count,
            "method":      "text",
            "image_bytes": None,
            "mime_type":   None,
        }

    # Scanned PDF — render first page at 2× resolution for AI Vision
    doc  = fitz.open(stream=pdf_bytes, filetype="pdf")
    page = doc[0]
    pix  = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
    img  = pix.tobytes("png")
    doc.close()

    return {
        "raw_text":    "",
        "confidence":  0.0,
        "pages":       page_count,
        "method":      "scanned",
        "image_bytes": img,
        "mime_type":   "image/png",
    }
