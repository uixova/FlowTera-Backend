const { Router }     = require('express');
const planController = require('./plan.controller');

const router = Router();

router.get('/',              planController.getAllPlans);
router.get('/:id',          planController.getPlanById);
router.post('/:id/click',   planController.trackClick);

module.exports = router;
export {};
