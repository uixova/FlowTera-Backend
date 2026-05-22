const { Router }          = require('express');
const expenseController   = require('./expense.controller');
const { authenticate }    = require('../../middlewares/authenticate');
const { teamGuard }       = require('../../middlewares/teamGuard');
const { adminGuard }      = require('../../middlewares/adminGuard');

const router = Router();

// teamId zorunlu (req.query.teamId)
router.get('/',              authenticate, teamGuard, expenseController.getExpenses);
// ID bazlı — teamGuard burada çalışamaz; servis katmanı sahipliği doğrular
router.get('/:id',          authenticate, expenseController.getExpenseById);
// teamId body'de gelir (req.body.teamId)
router.post('/',             authenticate, teamGuard, expenseController.createExpense);
router.put('/:id',          authenticate, expenseController.updateExpense);
// Onay/red — teamId body'de, sadece Admin yapabilir
router.patch('/:id/status', authenticate, teamGuard, adminGuard, expenseController.updateStatus);
router.delete('/:id',       authenticate, expenseController.deleteExpense);

module.exports = router;
export {};
