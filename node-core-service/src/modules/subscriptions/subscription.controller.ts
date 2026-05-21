const subscriptionService = require('./subscription.service');
const { upgradeSchema }   = require('./subscription.validators');

class SubscriptionController {
  async getUserSubscription(req: any, res: any, next: any) {
    try {
      const result = await subscriptionService.getUserSubscription(req.params.userId);
      if (!result) return res.status(404).json({ status: 'ERROR', message: 'Kullanıcı veya abonelik bulunamadı.' });
      return res.status(200).json({ status: 'OK', data: result });
    } catch (error) { next(error); }
  }

  async getAvailablePlans(req: any, res: any, next: any) {
    try {
      const plans = await subscriptionService.getAvailablePlans();
      return res.status(200).json({ status: 'OK', data: plans });
    } catch (error) { next(error); }
  }

  async upgradePlan(req: any, res: any, next: any) {
    try {
      const parsed = upgradeSchema.safeParse(req.body);
      if (!parsed.success)
        return res.status(400).json({ status: 'ERROR', errors: parsed.error.flatten().fieldErrors });

      const result = await subscriptionService.upgradePlan(req.params.userId, parsed.data.planId);
      return res.status(200).json({ status: 'OK', ...result });
    } catch (error: any) {
      res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }

  async cancelSubscription(req: any, res: any, next: any) {
    try {
      const result = await subscriptionService.cancelSubscription(req.params.userId);
      return res.status(200).json({ status: 'OK', ...result });
    } catch (error: any) {
      res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }
}

module.exports = new SubscriptionController();
export {};
