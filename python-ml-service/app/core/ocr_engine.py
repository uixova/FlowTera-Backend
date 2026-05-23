import io
import pytesseract
from PIL import Image, ImageFilter, ImageOps, ImageEnhance
from app.config import settings

if settings.TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

SUPPORTED_LANGS = "tur+eng"

# PSM modları: 6=uniform-block (çoğu fiş), 4=single-column, 3=auto
PSM_CONFIGS = [
    "--psm 6 --oem 3",
    "--psm 4 --oem 3",
    "--psm 3 --oem 3",
]

MIN_SIDE = 1000  # piksel — küçük görseller bu boyuta kadar ölçeklenir


def _preprocess(image: Image.Image) -> Image.Image:
    """Gri → upscale → sharpen → threshold."""
    if image.mode != "L":
        image = image.convert("L")

    # Küçük görselleri büyüt (300 DPI eşdeğeri için minimum kenar uzunluğu)
    w, h = image.size
    if min(w, h) < MIN_SIDE:
        scale = MIN_SIDE / min(w, h)
        image = image.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    # Keskinleştir
    image = image.filter(ImageFilter.SHARPEN)
    image = ImageEnhance.Contrast(image).enhance(1.5)

    # Otsu benzeri eşikleme — PIL ile basit global threshold
    image = image.point(lambda p: 255 if p > 128 else 0)

    return image


def _run_ocr(image: Image.Image, config: str) -> tuple[str, float]:
    """Verilen config ile OCR çalıştırır. (text, avg_conf) döner."""
    data = pytesseract.image_to_data(
        image,
        lang=SUPPORTED_LANGS,
        config=config,
        output_type=pytesseract.Output.DICT,
    )
    words, confs = [], []
    for i, text in enumerate(data["text"]):
        conf = int(data["conf"][i])
        if conf > 40 and text.strip():
            words.append(text.strip())
            confs.append(conf)
        elif conf > 0:
            confs.append(conf)

    avg_conf = sum(confs) / len(confs) if confs else 0.0
    return " ".join(words), round(avg_conf, 1)


def extract_text(image_bytes: bytes) -> dict:
    """Görüntüden ham metin çıkarır. En iyi PSM sonucu seçilir."""
    image = Image.open(io.BytesIO(image_bytes))
    processed = _preprocess(image)

    best_text, best_conf = "", 0.0
    for config in PSM_CONFIGS:
        text, conf = _run_ocr(processed, config)
        if conf > best_conf or (conf == best_conf and len(text) > len(best_text)):
            best_text, best_conf = text, conf
        if best_conf >= 80:
            break  # yeterince iyi, daha fazla deneme gereksiz

    return {"raw_text": best_text, "confidence": best_conf}
