const paymentService = require('./payment.service');
const { createIntentSchema, simulateSuccessSchema } = require('./payment.validators');

class PaymentController {

  // POST /payments/create-intent
  // Body: { planId }
  // Frontend bu clientSecret ile stripe.confirmCardPayment() çağırır
  async createPaymentIntent(req: any, res: any, next: any) {
    try {
      const parsed = createIntentSchema.safeParse(req.body);
      if (!parsed.success)
        return res.status(400).json({ status: 'ERROR', errors: parsed.error.flatten().fieldErrors });

      const userId = req.user?.userId;
      if (!userId)
        return res.status(401).json({ status: 'ERROR', message: 'Oturum açmanız gerekiyor.' });

      const result = await paymentService.createPaymentIntent(userId, parsed.data.planId);
      return res.status(200).json({ status: 'OK', data: result });
    } catch (error: any) {
      res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }

  // POST /payments/simulate-success  (Yalnızca geliştirme ortamında aktif)
  // Body: { paymentIntentId }
  // Simülasyon modunda ödemeyi başarılı olarak işaretler ve planı aktif eder
  async simulateSuccess(req: any, res: any, next: any) {
    try {
      if (process.env.NODE_ENV === 'production')
        return res.status(403).json({ status: 'ERROR', message: 'Bu endpoint production\'da kullanılamaz.' });

      const parsed = simulateSuccessSchema.safeParse(req.body);
      if (!parsed.success)
        return res.status(400).json({ status: 'ERROR', errors: parsed.error.flatten().fieldErrors });

      const result = await paymentService.simulatePaymentSuccess(
        parsed.data.paymentIntentId,
        req.user?.userId,
      );
      return res.status(200).json({ status: 'OK', ...result });
    } catch (error: any) {
      res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }

  // POST /payments/webhook  (Stripe'dan gelir — auth middleware olmadan)
  // req.rawBody, app.ts'deki express.json verify ile doldurulur
  async handleWebhook(req: any, res: any, next: any) {
    try {
      const signature = req.headers['stripe-signature'] as string;
      if (!signature)
        return res.status(400).json({ status: 'ERROR', message: 'stripe-signature header eksik.' });

      if (!req.rawBody)
        return res.status(400).json({ status: 'ERROR', message: 'Ham gövde alınamadı.' });

      const result = await paymentService.handleWebhookEvent(req.rawBody, signature);
      return res.status(200).json(result);
    } catch (error: any) {
      // Stripe 400 bekler — 500 dönmemeli
      return res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }

  // GET /payments/history/:userId
  async getPaymentHistory(req: any, res: any, next: any) {
    try {
      const { userId } = req.params;
      if (req.user?.userId !== userId)
        return res.status(403).json({ status: 'ERROR', message: 'Başkasının ödeme geçmişine erişemezsiniz.' });

      const history = await paymentService.getPaymentHistory(userId);
      return res.status(200).json({ status: 'OK', data: history });
    } catch (error) { next(error); }
  }

  // POST /payments/refund/:id
  async refundPayment(req: any, res: any, next: any) {
    try {
      const result = await paymentService.refundPayment(req.params.id, req.user?.userId);
      return res.status(200).json({ status: 'OK', ...result });
    } catch (error: any) {
      res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }
}

module.exports = new PaymentController();
export {};
