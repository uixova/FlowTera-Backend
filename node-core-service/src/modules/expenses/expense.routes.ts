const { Router }        = require('express');
const expenseController = require('./expense.controller');
const { authenticate }  = require('../../middlewares/authenticate');

const router = Router();

router.get('/',              authenticate, expenseController.getExpenses);
router.get('/:id',          authenticate, expenseController.getExpenseById);
router.post('/',             authenticate, expenseController.createExpense);
router.put('/:id',          authenticate, expenseController.updateExpense);
router.patch('/:id/status', authenticate, expenseController.updateStatus);
router.delete('/:id',       authenticate, expenseController.deleteExpense);

module.exports = router;
export {};
