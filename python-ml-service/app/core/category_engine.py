from typing import Optional

# Anahtar kelime → kategori eşlemesi (Türkçe ve İngilizce)
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "yemek":      ["restoran", "kafe", "market", "manav", "fast food", "food", "restaurant", "cafe"],
    "ulaşım":     ["taksi", "taxi", "uber", "otobüs", "metro", "bilet", "akbil", "benzin", "fuel"],
    "konaklama":  ["otel", "hotel", "hostel", "airbnb", "pansiyon"],
    "alışveriş":  ["mağaza", "shop", "store", "market", "zara", "h&m", "adidas", "nike"],
    "sağlık":     ["eczane", "hastane", "klinik", "doktor", "pharmacy", "hospital", "ilaç"],
    "eğlence":    ["sinema", "konser", "tiyatro", "bar", "cinema", "ticket"],
    "eğitim":     ["kitap", "kurs", "okul", "üniversite", "udemy", "coursera"],
    "fatura":     ["elektrik", "su", "doğalgaz", "internet", "telefon", "fatura", "bill"],
}

def categorize(text: str) -> Optional[str]:
    """Ham metni okuyup en uygun kategoriyi döner."""
    lower = text.lower()
    scores: dict[str, int] = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in lower)
        if score:
            scores[category] = score
    if not scores:
        return None
    return max(scores, key=lambda k: scores[k])
