const expenseService = require('./expense.service');

class ExpenseController {
  async getExpenses(req: any, res: any, next: any) {
    try {
      const { teamId } = req.query;
      if (!teamId) return res.status(400).json({ status: 'ERROR', message: 'teamId zorunludur.' });

      const page     = parseInt(req.query.page     as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const result   = await expenseService.getAllExpenses(teamId, page, pageSize);
      return res.status(200).json({ status: 'OK', ...result });
    } catch (error) { next(error); }
  }

  async getExpenseById(req: any, res: any, next: any) {
    try {
      const expense = await expenseService.getExpenseById(req.params.id);
      if (!expense) return res.status(404).json({ status: 'ERROR', message: 'Harcama bulunamadı.' });
      return res.status(200).json({ status: 'OK', data: expense });
    } catch (error) { next(error); }
  }

  async createExpense(req: any, res: any, next: any) {
    try {
      const { title, category, merchant, date, amount, currency, currencySymbol, teamId } = req.body;
      if (!title || !category || !merchant || !date || !amount || !currency || !currencySymbol || !teamId)
        return res.status(400).json({ status: 'ERROR', message: 'Zorunlu alanlar eksik.' });

      const createdById = req.user?.userId || req.body.userId;
      if (!createdById) return res.status(400).json({ status: 'ERROR', message: 'Kullanıcı kimliği bulunamadı.' });

      const expense = await expenseService.createExpense(req.body, createdById);
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

      const expense = await expenseService.updateStatus(req.params.id, status, rejectionReason);
      return res.status(200).json({ status: 'OK', data: expense });
    } catch (error) { next(error); }
  }

  async deleteExpense(req: any, res: any, next: any) {
    try {
      const result = await expenseService.deleteExpense(req.params.id);
      return res.status(200).json({ status: 'OK', ...result });
    } catch (error) { next(error); }
  }
}

module.exports = new ExpenseController();
export {};
