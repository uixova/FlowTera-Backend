const { Router }          = require('express');
const expenseController   = require('./expense.controller');
const { authenticate }    = require('../../middlewares/authenticate');
const { teamGuard }       = require('../../middlewares/teamGuard');
const { adminGuard }      = require('../../middlewares/adminGuard');
const { validate }        = require('../../middlewares/validate');
const {
  createExpenseSchema,
  updateExpenseSchema,
  updateStatusSchema,
} = require('./expense.validators');

const router = Router();

// Analiz dışa aktarma — teamGuard öncesinde gelsin (query param teamId)
router.get('/export',        authenticate, teamGuard, expenseController.exportAnalysis);
// teamId zorunlu (req.query.teamId)
router.get('/',              authenticate, teamGuard, expenseController.getExpenses);
// ID bazlı — teamGuard burada çalışamaz; servis katmanı sahipliği doğrular
router.get('/:id',          authenticate, expenseController.getExpenseById);
// teamId body'de gelir (req.body.teamId)
router.post('/',             authenticate, teamGuard, validate(createExpenseSchema), expenseController.createExpense);
router.put('/:id',          authenticate, validate(updateExpenseSchema), expenseController.updateExpense);
// Onay/red — teamId body'de, sadece Admin yapabilir
router.patch('/:id/status', authenticate, teamGuard, adminGuard, validate(updateStatusSchema), expenseController.updateStatus);
router.delete('/:id',       authenticate, expenseController.deleteExpense);

module.exports = router;
export {};
