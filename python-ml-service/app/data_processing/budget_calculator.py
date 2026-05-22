from app.schemas.analysis import BudgetStatus

def calculate_budget(
    expenses: list,
    team_id: str,
    period: str,
    budget_limit: float | None,
) -> BudgetStatus:
    """Dönem harcamalarını bütçeyle karşılaştırır."""
    total   = sum(float(r["amount"]) for r in expenses if r.get("amount"))
    currency = expenses[0]["currency"] if expenses else "TRY"

    remaining  = None
    over_budget = False
    if budget_limit is not None:
        remaining   = round(budget_limit - total, 2)
        over_budget = total > budget_limit

    return BudgetStatus(
        team_id=team_id,
        period=period,
        total_spent=round(total, 2),
        budget_limit=budget_limit,
        remaining=remaining,
        over_budget=over_budget,
        currency=currency,
    )
