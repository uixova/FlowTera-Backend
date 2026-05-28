import { PrismaClient } from '@prisma/client';

export async function seedPlans(prisma: PrismaClient) {
  console.log('Seeding Plans...');

  const plans = [
    {
      id: "78b11082-5f20-431f-b4cf-f21121e50fbb",
      name: "Ücretsiz",
      price: 0,
      currency: "USD",
      features: [
        { text: "Günlük harcama takibi",            textKey: "feat_daily_tracking",      included: true  },
        { text: "Topluluk destek forumu",            textKey: "feat_community_support",   included: true  },
        { text: "Sınırlı işlem geçmişi (son 2 ay)", textKey: "feat_limited_history_2mo", included: true  },
        { text: "Akıllı OCR Fatura Tarama",          textKey: "feat_ocr_scan",            included: false },
        { text: "Tema Yönetim Paneli",               textKey: "feat_theme_panel",         included: false },
        { text: "AI Finansal Analiz",                textKey: "feat_ai_analysis",         included: false },
        { text: "Otomasyon",                         textKey: "feat_automation",          included: false },
      ],
      feature_keys: ["daily_tracking", "community_forum", "limited_history"],
      promise: { teamLimit: "2", TeamMemberLimit: "5" },
      description: "Bireysel takip için temel araçlar.",
      cta: "Ücretsiz Başlayın",
      icon: "ti-home-eco",
      badge: "free",
      popular: false,
      order: 1,
    },
    {
      id: "070cf2e2-a805-4a13-9129-e45551e10073",
      name: "Premium",
      price: 9.99,
      currency: "USD",
      features: [
        { text: "Günlük harcama takibi",     textKey: "feat_daily_tracking",    included: true  },
        { text: "Öncelikli e-posta desteği", textKey: "feat_priority_support",  included: true  },
        { text: "Sınırsız işlem geçmişi",    textKey: "feat_unlimited_history", included: true  },
        { text: "Akıllı OCR Fatura Tarama",  textKey: "feat_ocr_scan",          included: false },
        { text: "Tema Yönetim Paneli",       textKey: "feat_theme_panel",       included: false },
        { text: "AI Finansal Analiz",        textKey: "feat_ai_analysis",       included: false },
        { text: "Otomasyon",                 textKey: "feat_automation",        included: true  },
      ],
      feature_keys: ["daily_tracking", "community_forum", "priority_support", "unlimited_history", "automation"],
      promise: { teamLimit: "5", TeamMemberLimit: "20" },
      description: "Daha disiplinli bir bütçe yönetimi.",
      cta: "Premium'a Yükselt",
      icon: "ti-flag-star",
      badge: "premium",
      popular: true,
      order: 2,
    },
    {
      id: "13433988-d39c-43f0-a731-51f2bb4749ec",
      name: "Professional",
      price: 19.99,
      currency: "USD",
      features: [
        { text: "Günlük harcama takibi",     textKey: "feat_daily_tracking",    included: true  },
        { text: "Öncelikli e-posta desteği", textKey: "feat_priority_support",  included: true  },
        { text: "Sınırsız işlem geçmişi",    textKey: "feat_unlimited_history", included: true  },
        { text: "Akıllı OCR Fatura Tarama",  textKey: "feat_ocr_scan",          included: true  },
        { text: "Tema Yönetim Paneli",       textKey: "feat_theme_panel",       included: true  },
        { text: "Gelişmiş Fatura Arşivi",    textKey: "feat_invoice_archive",   included: true  },
        { text: "AI Finansal Analiz",        textKey: "feat_ai_analysis",       included: false },
      ],
      feature_keys: ["daily_tracking", "priority_support", "unlimited_history", "automation", "ocr_scan", "theme_management", "advanced_archive"],
      ocrLimit: 100,
      promise: { teamLimit: "15", TeamMemberLimit: "50" },
      description: "Ekipler ve profesyoneller için.",
      cta: "Pro'ya Geç",
      icon: "ti-shield-check",
      badge: "professional",
      popular: false,
      order: 3,
    },
    {
      id: "7fe59f64-6bee-4816-bd66-4d12a8822042",
      name: "Kurumsal",
      price: 49.99,
      currency: "USD",
      features: [
        { text: "Günlük harcama takibi",  textKey: "feat_daily_tracking",    included: true },
        { text: "7/24 Özel Destek Hattı", textKey: "feat_dedicated_support", included: true },
        { text: "Sınırsız işlem geçmişi", textKey: "feat_unlimited_history", included: true },
        { text: "Gelişmiş Toplu OCR",     textKey: "feat_batch_ocr",         included: true },
        { text: "Özel Ekip Paneli",       textKey: "feat_custom_dashboard",  included: true },
        { text: "AI Destekli Analiz",     textKey: "feat_ai_analytics",      included: true },
        { text: "Tüm Özellikler",         textKey: "feat_all_features",      included: true },
      ],
      feature_keys: ["daily_tracking", "priority_support", "24_7_support", "unlimited_history", "automation", "ocr_scan", "bulk_ocr", "theme_management", "team_panel", "ai_analysis", "all_features"],
      ocrLimit: 250,
      promise: { teamLimit: "50", TeamMemberLimit: "150" },
      description: "Tam otomasyon ve kurumsal çözümler.",
      cta: "Satışla Görüşün",
      icon: "ti-building-skyscraper",
      badge: "enterprise",
      popular: false,
      order: 4,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where:  { id: plan.id },
      update: plan,
      create: plan,
    });
  }

  console.log(`Seeded ${plans.length} plans.`);
}
