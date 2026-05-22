from typing import List
from collections import defaultdict
from app.data_processing.normalizer import normalize_expense
from app.schemas.analysis import ExpenseAnalysisResponse, CategoryBreakdown, MonthlyTrend

def analyze_expenses(rows: list, team_id: str) -> ExpenseAnalysisResponse:
    """Ham DB satırlarından harcama analizi üretir."""
    if not rows:
        return ExpenseAnalysisResponse(
            team_id=team_id, total=0, count=0, currency="TRY",
            categories=[], monthly=[], top_merchant=None,
        )

    expenses = [normalize_expense(dict(r)) for r in rows]
    total    = sum(e["amount"] for e in expenses)
    currency = expenses[0]["currency"] if expenses else "TRY"

    # Kategori dağılımı
    cat_totals: dict[str, float] = defaultdict(float)
    cat_counts: dict[str, int]   = defaultdict(int)
    for e in expenses:
        cat_totals[e["category"]] += e["amount"]
        cat_counts[e["category"]] += 1

    categories = [
        CategoryBreakdown(
            category=cat,
            total=round(cat_totals[cat], 2),
            count=cat_counts[cat],
            percent=round(cat_totals[cat] / total * 100, 1) if total else 0,
        )
        for cat in sorted(cat_totals, key=lambda k: cat_totals[k], reverse=True)
    ]

    # Aylık trend
    monthly_map: dict[str, dict] = defaultdict(lambda: {"total": 0.0, "count": 0})
    for e in expenses:
        if e["date"]:
            month = e["date"][:7]  # "2026-05"
            monthly_map[month]["total"] += e["amount"]
            monthly_map[month]["count"] += 1

    monthly = [
        MonthlyTrend(month=m, total=round(v["total"], 2), count=v["count"])
        for m, v in sorted(monthly_map.items())
    ]

    # En çok harcama yapılan merchant
    merchant_totals: dict[str, float] = defaultdict(float)
    for e in expenses:
        if e["merchant"]:
            merchant_totals[e["merchant"]] += e["amount"]
    top_merchant = max(merchant_totals, key=lambda k: merchant_totals[k]) if merchant_totals else None

    return ExpenseAnalysisResponse(
        team_id=team_id, total=round(total, 2), count=len(expenses),
        currency=currency, categories=categories, monthly=monthly,
        top_merchant=top_merchant,
    )
