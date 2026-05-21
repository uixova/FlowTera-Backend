const prisma = require('../../config/prisma');

// ─── Stripe lazy-init ────────────────────────────────────────────────────────
// Stripe yalnızca gerçek bir key varsa başlatılır.
// Key yoksa uygulama crash etmez — simülasyon moduna girer.
const initStripe = (): any | null => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'sk_test_placeholder') return null;
  const Stripe = require('stripe');
  return new Stripe(key, { apiVersion: '2024-11-20.acacia' });
};

const isSimulation = (): boolean =>
  !process.env.STRIPE_SECRET_KEY ||
  process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder';

// ─── Abonelik aktivasyonu (ödeme sonrası çağrılır) ────────────────────────────
const activateUserSubscription = async (userId: string, planId: string) => {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) return;

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { subscription: true },
  });
  const currentUsage = (user?.subscription as any)?.usage || { ocr: 0, aiAnaliz: 0 };

  const newSub = {
    planId,
    plan:              plan.name,
    maxTeams:          plan.promise ? parseInt((plan.promise as any).teamLimit       || '1', 10) : 1,
    maxMembersPerTeam: plan.promise ? parseInt((plan.promise as any).TeamMemberLimit || '5', 10) : 5,
    usage:             currentUsage,
    feature_keys:      plan.feature_keys || [],
  };

  await prisma.user.update({
    where: { id: userId },
    data:  { subscription: newSub },
  });
};

// ─── Stripe Customer yönetimi ─────────────────────────────────────────────────
const getOrCreateStripeCustomer = async (userId: string, stripe: any): Promise<string> => {
  const user = await prisma.user.findUnique({
    where:  { id: userId, isDeleted: false },
    select: { id: true, email: true, name: true, stripeCustomerId: true },
  });
  if (!user) throw new Error('Kullanıcı bulunamadı.');

  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    email:    user.email,
    name:     user.name,
    metadata: { userId: user.id },
  });

  await prisma.user.update({
    where: { id: userId },
    data:  { stripeCustomerId: customer.id },
  });

  return customer.id;
};

// ─── Service ─────────────────────────────────────────────────────────────────
class PaymentService {

  // Adım 1: PaymentIntent oluştur — clientSecret frontend'e gönderilir.
  // Frontend: stripe.confirmCardPayment(clientSecret, { payment_method: { card: cardElement } })
  async createPaymentIntent(userId: string, planId: string) {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('Plan bulunamadı.');

    if (isSimulation()) {
      // Stripe bağlantısı yok — geliştirme ortamı simülasyonu
      const simId = `sim_pi_${Date.now()}_${userId.slice(0, 6)}`;

      await prisma.paymentRecord.create({
        data: {
          userId,
          planId,
          amount:                plan.price,
          currency:              (plan.currency || 'usd').toLowerCase(),
          status:                'pending',
          planName:              plan.name,
          stripePaymentIntentId: simId,
        },
      });

      return {
        clientSecret:    `${simId}_secret_simulation`,
        paymentIntentId: simId,
        amount:          plan.price,
        currency:        (plan.currency || 'usd').toLowerCase(),
        planName:        plan.name,
        simulationMode:  true,
      };
    }

    const stripe      = initStripe();
    const customerId  = await getOrCreateStripeCustomer(userId, stripe);
    const amountCents = Math.round(plan.price * 100); // Stripe cent cinsinden alır

    const intent = await stripe.paymentIntents.create({
      amount:   amountCents,
      currency: (plan.currency || 'usd').toLowerCase(),
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: { userId, planId, planName: plan.name },
    });

    await prisma.paymentRecord.create({
      data: {
        userId,
        planId,
        amount:                plan.price,
        currency:              (plan.currency || 'usd').toLowerCase(),
        status:                'pending',
        planName:              plan.name,
        stripePaymentIntentId: intent.id,
        stripeCustomerId:      customerId,
      },
    });

    return {
      clientSecret:    intent.client_secret,
      paymentIntentId: intent.id,
      amount:          plan.price,
      currency:        (plan.currency || 'usd').toLowerCase(),
      planName:        plan.name,
      simulationMode:  false,
    };
  }

  // Simülasyon modunda ödemeyi başarılı olarak işaretle (sadece development)
  async simulatePaymentSuccess(paymentIntentId: string, userId: string) {
    if (!isSimulation()) {
      throw new Error('Bu endpoint yalnızca simülasyon modunda kullanılabilir.');
    }

    const record = await prisma.paymentRecord.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    if (!record) throw new Error('Ödeme kaydı bulunamadı.');
    if (record.userId !== userId) throw new Error('Bu ödeme size ait değil.');

    await prisma.paymentRecord.update({
      where: { stripePaymentIntentId: paymentIntentId },
      data:  { status: 'succeeded' },
    });

    await activateUserSubscription(userId, record.planId);

    return {
      success: true,
      message: `[SIM] Ödeme başarıyla tamamlandı. ${record.planName || ''} planı aktif edildi.`,
    };
  }

  // Stripe Webhook — app.ts'deki rawBody verify ile çalışır
  async handleWebhookEvent(rawBody: Buffer, signature: string) {
    if (isSimulation()) return { received: true };

    const stripe        = initStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET .env\'e eklenmemiş.');

    let event: any;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      throw new Error(`Webhook imza doğrulaması başarısız: ${err.message}`);
    }

    switch (event.type) {

      case 'payment_intent.succeeded': {
        const intent              = event.data.object;
        const { userId, planId } = intent.metadata || {};

        if (!userId || !planId) break;

        // Kart bilgilerini çek (opsiyonel)
        let cardLastFour: string | null = null;
        let cardBrand:    string | null = null;
        if (intent.payment_method) {
          try {
            const pm  = await stripe.paymentMethods.retrieve(intent.payment_method);
            cardLastFour = pm.card?.last4 || null;
            cardBrand    = pm.card?.brand || null;
          } catch {}
        }

        await prisma.paymentRecord.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data:  { status: 'succeeded', cardLastFour, cardBrand },
        });

        await activateUserSubscription(userId, planId);
        break;
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        await prisma.paymentRecord.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data: {
            status:        'failed',
            failureReason: intent.last_payment_error?.message || 'Ödeme reddedildi.',
          },
        });
        break;
      }

      case 'charge.refunded': {
        const charge      = event.data.object;
        const intentId    = charge.payment_intent;
        if (intentId) {
          await prisma.paymentRecord.updateMany({
            where: { stripePaymentIntentId: intentId },
            data:  { status: 'refunded' },
          });
        }
        break;
      }

      default:
        break;
    }

    return { received: true };
  }

  // Kullanıcı ödeme geçmişi
  async getPaymentHistory(userId: string) {
    return prisma.paymentRecord.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // İade — yalnızca başarılı ödemeler için
  async refundPayment(paymentRecordId: string, requesterId: string) {
    const record = await prisma.paymentRecord.findUnique({
      where: { id: paymentRecordId },
    });
    if (!record)                        throw new Error('Ödeme kaydı bulunamadı.');
    if (record.userId !== requesterId)  throw new Error('Bu ödeme size ait değil.');
    if (record.status !== 'succeeded')  throw new Error('Yalnızca başarılı ödemeler iade edilebilir.');

    if (isSimulation()) {
      await prisma.paymentRecord.update({
        where: { id: paymentRecordId },
        data:  { status: 'refunded' },
      });
      return { success: true, message: '[SIM] İade başarıyla gerçekleştirildi.' };
    }

    const stripe = initStripe();
    if (!record.stripePaymentIntentId) throw new Error('Stripe PaymentIntent ID bulunamadı.');

    await stripe.refunds.create({ payment_intent: record.stripePaymentIntentId });

    await prisma.paymentRecord.update({
      where: { id: paymentRecordId },
      data:  { status: 'refunded' },
    });

    return { success: true, message: 'İade başarıyla gerçekleştirildi.' };
  }
}

module.exports = new PaymentService();
export {};
