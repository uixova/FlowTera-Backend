"""fpdf2 tabanlı harcama raporu PDF üretici."""
from fpdf import FPDF
from datetime import datetime

_TR_TABLE = str.maketrans("ışğİŞĞ", "isgISG")


def _s(text: str) -> str:
    """Helvetica uyumlu: ı/ş/ğ → i/s/g, geri kalan latin-1 dışını '?' yapar."""
    return str(text).translate(_TR_TABLE).encode("latin-1", errors="replace").decode("latin-1")


class ExpenseReportPDF(FPDF):
    def __init__(self, team_name: str = "FlowTera"):
        super().__init__()
        self.team_name = team_name

    def header(self):
        self.set_font("Helvetica", "B", 16)
        self.cell(0, 10, "FlowTera", ln=True, align="C")
        self.set_font("Helvetica", "", 10)
        self.cell(0, 6, "Harcama Raporu / Expense Report", ln=True, align="C")
        self.set_font("Helvetica", "", 8)
        self.cell(0, 5, _s(f"Takim: {self.team_name}"), ln=True, align="C")
        self.ln(3)
        self.set_draw_color(200, 200, 200)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Sayfa {self.page_no()} | Uretim: {datetime.now().strftime('%Y-%m-%d %H:%M')}", align="C")
        self.set_text_color(0, 0, 0)


def build_expense_report(expense: dict, team_name: str = "FlowTera") -> bytes:
    """
    Tek bir harcama için standart PDF rapor üretir.
    expense dict keys: id, title, category, merchant, amount, currency,
                       currencySymbol, date, status, desc, paymentMethod,
                       user (olusturan adi), receipt (S3 key opsiyonel)
    """
    pdf = ExpenseReportPDF(team_name=team_name)
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "Harcama Detay Raporu", ln=True)
    pdf.ln(2)

    date_val = expense.get("date") or ""
    if isinstance(date_val, datetime):
        date_str = date_val.strftime("%d.%m.%Y")
    else:
        date_str = str(date_val)[:10] if date_val else "-"

    amount   = expense.get("amount", 0)
    currency = expense.get("currency", "TRY")
    symbol   = _s(str(expense.get("currencySymbol", currency)))

    def row(label: str, value: str):
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(50, 7, label + ":", border=0)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(0, 7, _s(value), ln=True, border=0)

    row("Harcama Adi",   str(expense.get("title", "-")))
    row("Tarih",         date_str)
    row("Satici / Yer",  str(expense.get("merchant", "-")))
    row("Kategori",      str(expense.get("category", "-")))
    row("Odeme Yontemi", str(expense.get("paymentMethod") or "-"))
    row("Durum",         str(expense.get("status", "pending")).upper())
    row("Olusturan",     str(expense.get("user", "-")))

    pdf.ln(3)
    pdf.set_draw_color(220, 220, 220)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "Toplam Tutar", ln=True)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(30, 100, 200)
    pdf.cell(0, 12, f"{symbol}{amount:,.2f}  ({currency})", ln=True, align="C")
    pdf.set_text_color(0, 0, 0)
    pdf.ln(4)

    if expense.get("localAmount") and expense.get("localCurrency"):
        local_sym = _s(str(expense.get("localSymbol", expense["localCurrency"])))
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(0, 6, _s(f"Yerel Tutar: {local_sym}{expense['localAmount']:,.2f} ({expense['localCurrency']})"), ln=True)
        pdf.ln(2)

    if expense.get("desc"):
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(0, 7, "Aciklama:", ln=True)
        pdf.set_font("Helvetica", "", 9)
        pdf.multi_cell(0, 6, _s(str(expense["desc"])))
        pdf.ln(2)

    if expense.get("receipt"):
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(0, 6, "* Fatura/fis goruntusu sistemde saklanmaktadir.", ln=True)
        pdf.set_text_color(0, 0, 0)

    pdf.ln(6)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)

    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 5, "Bu rapor FlowTera sistemi tarafindan otomatik olarak uretilmistir.", ln=True, align="C")
    pdf.set_text_color(0, 0, 0)

    return bytes(pdf.output())
