import { PrismaClient } from '@prisma/client';

export async function seedPlans(prisma: PrismaClient) {
  console.log('Seeding Plans...');
  const plans = [
    {
      name: "Ücretsiz",
      price: 0,
      currency: "USD",
      features: [
        { text: "Günlük harcama takibi", included: true },
        { text: "Akıllı OCR Fatura Tarama", included: false }
      ],
      feature_keys: ["daily_tracking", "community_forum", "limited_history"],
      promise: { teamLimit: "2 takım", TeamMemberLimit: "5 üye" },
      description: "Bireysel takip için temel araçlar.",
      cta: "Ücretsiz Başlayın",
      icon: "ti-home-eco",
      badge: "free",
      popular: false,
      order: 1
    },
    // Enterprise planı JSON'dan çekilip eklenecek (Kısa tutmak için tek örnek ekledim)
  ];

  for (const plan of plans) {
    await prisma.plan.create({ data: plan });
  }
}