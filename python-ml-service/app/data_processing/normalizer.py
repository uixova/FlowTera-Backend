from typing import Any

def normalize_expense(row: dict) -> dict:
    """DB'den gelen ham satırı tutarlı bir dict'e dönüştürür."""
    return {
        "id":       str(row.get("id", "")),
        "title":    row.get("title", ""),
        "category": row.get("category", "other"),
        "merchant": row.get("merchant", ""),
        "amount":   float(row.get("amount", 0)),
        "currency": row.get("currency", "TRY"),
        "status":   row.get("status", "pending"),
        "date":     row.get("date").isoformat() if row.get("date") else None,
    }
