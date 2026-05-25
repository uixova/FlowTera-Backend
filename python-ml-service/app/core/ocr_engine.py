"""
OCR engine — thin wrapper used by the /extract endpoint.
Delegates to ai_parser which handles Gemini/OpenAI providers.
"""
from app.core.ai_parser import extract_raw_text


def extract_text(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """Return {"raw_text": str, "confidence": float} for an image."""
    return extract_raw_text(image_bytes, mime_type)
