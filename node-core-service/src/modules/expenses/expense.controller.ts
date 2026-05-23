const expenseService   = require('./expense.service');
const { MAX_PAGE_SIZE } = require('../../config/constants');
const PYTHON_ML_URL    = process.env.PYTHON_ML_URL    || 'http://localhost:8000';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

class ExpenseController {
  async getExpenses(req: any, res: any, next: any) {
    try {
      const { teamId } = req.query;
      if (!teamId) return res.status(400).json({ status: 'ERROR', message: 'teamId zorunludur.' });

      const page     = Math.max(1, parseInt(req.query.page     as string) || 1);
      const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.pageSize as string) || 20));
      const result   = await expenseService.getAllExpenses(teamId, page, pageSize);
      return res.status(200).json({ status: 'OK', ...result });
    } catch (error) { next(error); }
  }

  async getExpenseById(req: any, res: any, next: any) {
    try {
      const expense = await expenseService.getExpenseById(req.params.id, req.user.userId);
      if (!expense) return res.status(404).json({ status: 'ERROR', message: 'Harcama bulunamadı.' });
      return res.status(200).json({ status: 'OK', data: expense });
    } catch (error) { next(error); }
  }

  async createExpense(req: any, res: any, next: any) {
    try {
      const { title, category, merchant, amount, currency, teamId } = req.body;
      if (!title || !category || !merchant || !amount || !currency || !teamId)
        return res.status(400).json({ status: 'ERROR', message: 'Zorunlu alanlar eksik.' });

      const createdById = req.user.userId;
      const role        = req.teamMember?.roleName || 'Member';
      const expense     = await expenseService.createExpense(req.body, createdById, role);
      return res.status(201).json({ status: 'OK', data: expense });
    } catch (error) { next(error); }
  }

  async updateExpense(req: any, res: any, next: any) {
    try {
      const expense = await expenseService.updateExpense(req.params.id, req.body);
      return res.status(200).json({ status: 'OK', data: expense });
    } catch (error) { next(error); }
  }

  async updateStatus(req: any, res: any, next: any) {
    try {
      const { status, rejectionReason } = req.body;
      if (!status) return res.status(400).json({ status: 'ERROR', message: 'status zorunludur.' });

      const adminName = req.user?.email || 'Admin';
      const teamId    = req.teamMember?.teamId;
      const expense   = await expenseService.updateStatus(req.params.id, status, adminName, rejectionReason, teamId);
      return res.status(200).json({ status: 'OK', data: expense });
    } catch (error) { next(error); }
  }

  async deleteExpense(req: any, res: any, next: any) {
    try {
      const result = await expenseService.deleteExpense(req.params.id);
      return res.status(200).json({ status: 'OK', ...result });
    } catch (error) { next(error); }
  }

  // GET /expenses/export?teamId=xxx&format=csv|pdf|excel&period=YYYY-MM
  async exportAnalysis(req: any, res: any, next: any) {
    try {
      const { teamId, format, period } = req.query;
      if (!teamId) return res.status(400).json({ status: 'ERROR', message: 'teamId zorunludur.' });
      if (!format) return res.status(400).json({ status: 'ERROR', message: 'format zorunludur (csv|pdf|excel).' });

      const qs    = new URLSearchParams({ format: format as string, ...(period ? { period: period as string } : {}) });
      const mlRes = await fetch(`${PYTHON_ML_URL}/ml/analysis/export/${teamId}?${qs}`, {
        headers: { 'X-Internal-API-Key': INTERNAL_API_KEY },
      });

      if (!mlRes.ok) {
        const err = await mlRes.json().catch(() => ({}));
        return res.status(mlRes.status).json({ status: 'ERROR', message: (err as any).detail || 'Dışa aktarma hatası.' });
      }

      const contentType = mlRes.headers.get('content-type') || 'application/octet-stream';
      const disposition = mlRes.headers.get('content-disposition') || `attachment; filename=export.${format}`;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', disposition);

      const buffer = await mlRes.arrayBuffer();
      return res.send(Buffer.from(buffer));
    } catch (error) { next(error); }
  }
}

module.exports = new ExpenseController();
export {};
