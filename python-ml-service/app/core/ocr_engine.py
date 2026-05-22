import io
import pytesseract
from PIL import Image
from app.config import settings

# Tesseract yolu yapılandırılmışsa uygula
if settings.TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

SUPPORTED_LANGS = "tur+eng"

def extract_text(image_bytes: bytes) -> dict:
    """Görüntüden ham metin çıkarır. Türkçe ve İngilizce birlikte denenir."""
    image = Image.open(io.BytesIO(image_bytes))
    # Gri tonlamaya çevir — OCR doğruluğunu artırır
    if image.mode != "L":
        image = image.convert("L")

    data = pytesseract.image_to_data(
        image,
        lang=SUPPORTED_LANGS,
        output_type=pytesseract.Output.DICT,
    )
    words = [
        data["text"][i]
        for i in range(len(data["text"]))
        if int(data["conf"][i]) > 40 and data["text"][i].strip()
    ]
    confidences = [int(c) for c in data["conf"] if int(c) > 0]
    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

    return {
        "raw_text":  " ".join(words),
        "confidence": round(avg_conf, 1),
    }
