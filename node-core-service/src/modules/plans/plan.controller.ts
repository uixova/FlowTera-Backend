const planService = require('./plan.service');

class PlanController {
  async getAllPlans(req: any, res: any, next: any) {
    try {
      const plans = await planService.getAllPlans();
      return res.status(200).json({ status: 'OK', data: plans });
    } catch (error) { next(error); }
  }

  async getPlanById(req: any, res: any, next: any) {
    try {
      const plan = await planService.getPlanById(req.params.id);
      if (!plan) return res.status(404).json({ status: 'ERROR', message: 'Plan bulunamadı.' });
      return res.status(200).json({ status: 'OK', data: plan });
    } catch (error) { next(error); }
  }

  async trackClick(req: any, res: any, next: any) {
    try {
      await planService.incrementClickedNumber(req.params.id);
      return res.status(200).json({ status: 'OK' });
    } catch (error) { next(error); }
  }
}

module.exports = new PlanController();
export {};
