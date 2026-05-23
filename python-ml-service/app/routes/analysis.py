import asyncio
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response
from typing import Optional
from app.data_processing.expense_analyzer import analyze_expenses
from app.data_processing.budget_calculator import calculate_budget
from app.data_processing.report_generator import generate_report
from app.schemas.analysis import ExpenseAnalysisResponse, BudgetStatus, ReportSummary
from app.core.export_engine import export_csv, export_excel, export_pdf

router = APIRouter(prefix="/analysis", tags=["Analiz"])

EXPENSE_QUERY = """
    SELECT id, title, category, merchant, amount, currency, status, date
    FROM "Expense"
    WHERE "teamId" = $1 AND status = 'approved'
    ORDER BY date DESC
"""

EXPENSE_PERIOD_QUERY = """
    SELECT id, title, category, merchant, amount, currency, status, date
    FROM "Expense"
    WHERE "teamId" = $1
      AND status = 'approved'
      AND EXTRACT(YEAR  FROM date) = $2
      AND EXTRACT(MONTH FROM date) = $3
    ORDER BY date DESC
"""

async def _get_expenses(request: Request, team_id: str, period: Optional[str] = None) -> list:
    """Sadece okuma — bağlantı havuzundan bir bağlantı alır."""
    pool = request.app.state.db_pool
    if pool is None:
        raise HTTPException(status_code=503, detail="Veritabanı bağlantısı yapılandırılmamış.")

    async with pool.acquire() as conn:
        if period:
            year, month = period.split("-")
            rows = await conn.fetch(EXPENSE_PERIOD_QUERY, team_id, int(year), int(month))
        else:
            rows = await conn.fetch(EXPENSE_QUERY, team_id)
    return list(rows)

@router.get("/expenses/{team_id}", response_model=ExpenseAnalysisResponse)
async def expense_analysis(
    request: Request,
    team_id: str,
    period: Optional[str] = Query(None, description="YYYY-MM formatında dönem"),
):
    """Takımın onaylanmış harcamalarını analiz eder."""
    rows = await _get_expenses(request, team_id, period)
    return analyze_expenses(rows, team_id)

@router.get("/budget/{team_id}", response_model=BudgetStatus)
async def budget_status(
    request: Request,
    team_id: str,
    period: str = Query(..., description="YYYY-MM formatında dönem"),
    budget_limit: Optional[float] = Query(None),
):
    """Dönem harcamalarını bütçeyle karşılaştırır."""
    rows = await _get_expenses(request, team_id, period)
    return calculate_budget(rows, team_id, period, budget_limit)

@router.get("/report/{team_id}", response_model=ReportSummary)
async def expense_report(
    request: Request,
    team_id: str,
    period: str = Query(..., description="YYYY-MM formatında dönem"),
):
    """Harcama özet raporu üretir."""
    rows = await _get_expenses(request, team_id, period)
    if not rows:
        raise HTTPException(status_code=404, detail="Bu dönem için veri bulunamadı.")
    return generate_report(rows, team_id, period)


@router.get("/export/{team_id}")
async def export_analysis(
    request: Request,
    team_id: str,
    format: str = Query(..., description="csv | pdf | excel"),
    period: Optional[str] = Query(None, description="YYYY-MM (boşsa tüm veriler)"),
):
    """Analiz verisini CSV / PDF / Excel olarak indirir."""
    fmt = format.lower().strip()
    if fmt not in ("csv", "pdf", "excel"):
        raise HTTPException(status_code=400, detail="format csv, pdf veya excel olmalıdır.")

    rows = await _get_expenses(request, team_id, period)
    if not rows:
        raise HTTPException(status_code=404, detail="Dışa aktarılacak veri bulunamadı.")

    period_label = period or "tum-zamanlar"
    rows_dicts = [dict(r) for r in rows]

    if fmt == "csv":
        content = await asyncio.to_thread(export_csv, rows_dicts, team_id, period_label)
        return Response(
            content=content,
            media_type="text/csv; charset=utf-8-sig",
            headers={"Content-Disposition": f"attachment; filename=analiz-{period_label}.csv"},
        )
    elif fmt == "excel":
        content = await asyncio.to_thread(export_excel, rows_dicts, team_id, period_label)
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=analiz-{period_label}.xlsx"},
        )
    else:  # pdf
        content = await asyncio.to_thread(export_pdf, rows_dicts, team_id, period_label)
        return Response(
            content=content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=analiz-{period_label}.pdf"},
        )
