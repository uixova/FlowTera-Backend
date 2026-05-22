from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class CategoryBreakdown(BaseModel):
    category: str
    total:    float
    count:    int
    percent:  float

class MonthlyTrend(BaseModel):
    month:  str   # "2026-05"
    total:  float
    count:  int

class ExpenseAnalysisResponse(BaseModel):
    team_id:    str
    total:      float
    count:      int
    currency:   str
    categories: List[CategoryBreakdown]
    monthly:    List[MonthlyTrend]
    top_merchant: Optional[str] = None

class BudgetStatus(BaseModel):
    team_id:       str
    period:        str   # "2026-05"
    total_spent:   float
    budget_limit:  Optional[float]
    remaining:     Optional[float]
    over_budget:   bool
    currency:      str

class ReportSummary(BaseModel):
    team_id:    str
    period:     str
    total:      float
    categories: List[CategoryBreakdown]
    top_items:  List[Dict[str, Any]]
