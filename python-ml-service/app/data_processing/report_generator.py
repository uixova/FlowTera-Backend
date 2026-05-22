from typing import List, Dict, Any
from app.data_processing.normalizer import normalize_expense
from app.data_processing.expense_analyzer import analyze_expenses
from app.schemas.analysis import ReportSummary

def generate_report(rows: list, team_id: str, period: str) -> ReportSummary:
    """Verilen harcama satırlarından özet rapor oluşturur."""
    analysis  = analyze_expenses(rows, team_id)
    expenses  = [normalize_expense(dict(r)) for r in rows]

    # En yüksek 5 harcama
    top_items = sorted(expenses, key=lambda e: e["amount"], reverse=True)[:5]
    top_dicts = [
        {"title": e["title"], "amount": e["amount"], "merchant": e["merchant"], "category": e["category"]}
        for e in top_items
    ]

    return ReportSummary(
        team_id=team_id,
        period=period,
        total=analysis.total,
        categories=analysis.categories,
        top_items=top_dicts,
    )
