const prisma = require('../../config/prisma');

// Frontend Plan tipine uyum: schema'daki `promise` (Json) alanını
// frontend'in beklediği `Promise` (büyük P) anahtarıyla gönderiyoruz.
const mapPlan = (plan: any) => {
  const { promise, ...rest } = plan;
  return {
    ...rest,
    Promise: promise || null, // Frontend: plan.Promise.teamLimit / plan.Promise.TeamMemberLimit
  };
};

class PlanService {
  // Tüm planları sıralı getir
  async getAllPlans() {
    const plans = await prisma.plan.findMany({
      orderBy: { order: 'asc' },
    });
    return plans.map(mapPlan);
  }

  // Tekil plan detayı
  async getPlanById(id: string) {
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) return null;
    return mapPlan(plan);
  }

  // Kullanıcı planı görüntüledi (clickedNumber artırma)
  async incrementClickedNumber(id: string) {
    return prisma.plan.update({
      where: { id },
      data:  { clickedNumber: { increment: 1 } },
    });
  }
}

module.exports = new PlanService();
export {};
