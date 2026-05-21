const prisma = require('../../config/prisma');
const { DEFAULT_SUBSCRIPTION } = require('../../config/constants');

// Plan verisinden User.subscription Json'u oluştur
const buildSubscriptionFromPlan = (plan: any, currentUsage: any) => ({
  planId:            plan.id,
  plan:              plan.name,
  maxTeams:          plan.promise ? parseInt((plan.promise as any).teamLimit  || '1',  10) : 1,
  maxMembersPerTeam: plan.promise ? parseInt((plan.promise as any).TeamMemberLimit || '5', 10) : 5,
  usage:             currentUsage || { ocr: 0, aiAnaliz: 0 },
  feature_keys:      plan.feature_keys || [],
});

class SubscriptionService {
  // Kullanıcının mevcut aboneliğini + eşleşen plan detayını döner
  async getUserSubscription(userId: string) {
    const user = await prisma.user.findUnique({
      where:  { id: userId, isDeleted: false },
      select: { subscription: true },
    });
    if (!user) return null;

    const sub   = (user.subscription as any) || DEFAULT_SUBSCRIPTION;
    const planId = sub.planId;

    const plan = planId
      ? await prisma.plan.findUnique({ where: { id: planId } })
      : null;

    return {
      ...sub,
      planName:    plan?.name || sub.plan || 'Free',
      planDetails: plan       || null,
    };
  }

  // Tüm mevcut planları sıralı getir (subscriptionService.getAvailablePlans ile aynı)
  async getAvailablePlans() {
    return prisma.plan.findMany({ orderBy: { price: 'asc' } });
  }

  // Kullanıcının planını yükselt/değiştir
  async upgradePlan(userId: string, planId: string) {
    const [user, plan] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId, isDeleted: false }, select: { subscription: true } }),
      prisma.plan.findUnique({ where: { id: planId } }),
    ]);

    if (!user)  throw new Error('Kullanıcı bulunamadı.');
    if (!plan)  throw new Error('Plan bulunamadı.');

    const currentUsage  = (user.subscription as any)?.usage || { ocr: 0, aiAnaliz: 0 };
    const newSubscription = buildSubscriptionFromPlan(plan, currentUsage);

    await prisma.user.update({
      where: { id: userId },
      data:  { subscription: newSubscription },
    });

    return {
      success: true,
      message: `Plan başarıyla ${plan.name} olarak güncellendi.`,
      subscription: { ...newSubscription, planName: plan.name, planDetails: plan },
    };
  }

  // Aboneliği iptal et — free plan varsayılanlarına döner
  async cancelSubscription(userId: string) {
    const user = await prisma.user.findUnique({
      where:  { id: userId, isDeleted: false },
      select: { subscription: true },
    });
    if (!user) throw new Error('Kullanıcı bulunamadı.');

    const currentUsage   = (user.subscription as any)?.usage || { ocr: 0, aiAnaliz: 0 };
    const freeSub = { ...DEFAULT_SUBSCRIPTION, usage: currentUsage };

    await prisma.user.update({
      where: { id: userId },
      data:  { subscription: freeSub },
    });

    return { success: true, message: 'Abonelik iptal edildi. Free plana geçildi.', subscription: freeSub };
  }

  // Feature erişim kontrolü
  async hasFeature(userId: string, featureKey: string): Promise<boolean> {
    const sub = await this.getUserSubscription(userId);
    return sub?.feature_keys?.includes(featureKey) ?? false;
  }
}

module.exports = new SubscriptionService();
export {};
