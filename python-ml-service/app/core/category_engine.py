from typing import Optional

# Expense kategori değerleri — frontend CreateExpense.jsx ile birebir eşleşir.
# Backend enum'u bu listeden oluşur; yeni kategori her iki yerde birden güncellenir.
EXPENSE_CATEGORIES = [
    "Food",
    "Transport",
    "Accommodation",
    "Health",
    "Entertainment",
    "Office",
    "Education",
    "Technology",
    "Shopping",
    "Utilities",
    "Finance",
    "Events",
    "Marketing",
    "Legal",
    "Other",
]

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Food": [
        "restoran", "kafe", "market", "manav", "fast food", "pizza", "burger",
        "food", "restaurant", "cafe", "coffee", "bakery", "supermarket",
        "yemek", "lokanta", "pastane", "kahve", "döner", "kebap",
    ],
    "Transport": [
        "taksi", "taxi", "uber", "otobüs", "metro", "bilet", "akbil",
        "benzin", "fuel", "petrol", "otogar", "havalimanı", "istasyon",
        "tren", "uçak", "ferry", "gemi", "transfer", "shuttle",
        "transport", "flight", "bus", "train", "airport", "parking",
        "otopark", "köprü", "otoyol", "toll",
    ],
    "Accommodation": [
        "otel", "hotel", "hostel", "airbnb", "pansiyon", "apart",
        "konaklama", "motel", "resort", "inn", "bnb", "suit",
    ],
    "Health": [
        "eczane", "hastane", "klinik", "doktor", "pharmacy", "hospital",
        "clinic", "ilaç", "optik", "diş", "dental", "medikal",
        "medical", "sağlık", "check-up", "lab", "tahlil",
    ],
    "Entertainment": [
        "sinema", "konser", "tiyatro", "bar", "kulüp",
        "cinema", "concert", "ticket", "bilet", "eğlence",
        "müze", "museum", "spor", "gym", "fitness", "bowling",
        "netflix", "spotify", "abonelik", "streaming",
    ],
    "Office": [
        "kırtasiye", "ofis", "office", "stationery", "kalem",
        "yazıcı", "printer", "toner", "kartuş", "kağıt",
        "masa", "sandalye", "dolap", "furniture",
    ],
    "Education": [
        "kitap", "book", "kurs", "course", "okul", "school",
        "üniversite", "university", "udemy", "coursera", "eğitim",
        "training", "sertifika", "certificate", "seminer", "seminar",
    ],
    "Technology": [
        "bilgisayar", "computer", "laptop", "tablet", "telefon", "phone",
        "yazılım", "software", "donanım", "hardware", "lisans", "license",
        "aws", "azure", "cloud", "hosting", "domain", "sunucu", "server",
        "apple", "microsoft", "google", "saas", "subscription",
    ],
    "Shopping": [
        "mağaza", "shop", "store", "zara", "h&m", "adidas", "nike",
        "giyim", "clothing", "ayakkabı", "shoes", "çanta", "bag",
        "alışveriş", "migros", "carrefour", "a101", "bim",
    ],
    "Utilities": [
        "elektrik", "electricity", "su", "water", "doğalgaz", "gas",
        "internet", "telefon", "phone bill", "fatura", "bill",
        "abonelik", "subscription", "iletişim", "communication",
    ],
    "Finance": [
        "banka", "bank", "komisyon", "commission", "faiz", "interest",
        "sigorta", "insurance", "vergi", "tax", "kur", "exchange",
        "transfer ücreti", "atm", "wire transfer",
    ],
    "Events": [
        "toplantı", "meeting", "konferans", "conference", "etkinlik",
        "event", "davet", "invitation", "organizasyon", "organization",
        "düğün", "wedding", "parti", "party", "kutlama", "celebration",
    ],
    "Marketing": [
        "reklam", "advertisement", "ads", "google ads", "meta ads",
        "pazarlama", "marketing", "tanıtım", "promotion", "baskı",
        "print", "tasarım", "design", "logo", "sosyal medya",
    ],
    "Legal": [
        "avukat", "lawyer", "hukuk", "legal", "noter", "notary",
        "sözleşme", "contract", "dava", "lawsuit", "danışmanlık",
        "consulting", "muhasebe", "accounting",
    ],
    "Other": [],  # Son çare
}


def categorize(text: str) -> Optional[str]:
    """
    Ham OCR metnini İngilizce PascalCase kategori değerine dönüştürür.
    Frontend CreateExpense.jsx ve Zod enum ile birebir eşleşir.
    Eşleşme yoksa None döner (frontend kendi varsayılanını kullanır).
    """
    lower = text.lower()
    scores: dict[str, int] = {}

    for category, keywords in CATEGORY_KEYWORDS.items():
        if not keywords:
            continue
        score = sum(1 for kw in keywords if kw in lower)
        if score:
            scores[category] = score

    if not scores:
        return None

    return max(scores, key=lambda k: scores[k])
