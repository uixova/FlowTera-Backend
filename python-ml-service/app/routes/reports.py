import asyncio
from fastapi import APIRouter
from fastapi.responses import Response
from app.core.report_builder import build_expense_report

router = APIRouter(prefix="/reports", tags=["Raporlar"])


@router.post("/expense")
async def generate_expense_report(body: dict):
    """
    Harcama verilerinden PDF rapor üretir.
    Body: expense dict + optional team_name
    Response: application/pdf binary
    """
    team_name = body.pop("team_name", "FlowTera")
    pdf_bytes = await asyncio.to_thread(build_expense_report, body, team_name)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=expense-report.pdf"},
    )
