const prisma = require('../config/prisma');

// Plan bazlı özellik (feature) erişim kontrolü.
// Takımın plan.feature_keys dizisinde ilgili özellik yoksa 403 döner.
// featureKey: plan.json'daki feature_keys değerlerinden biri olmalıdır.
//   Örn: 'ocr_scan', 'view_archive', 'ai_analysis', 'create_report'
//
// Kullanım: router.post('/scan', authenticate, planGuard('ocr_scan'), controller.scan)
const planGuard = (featureKey: string) => async (req: any, res: any, next: any) => {
  try {
    const teamId = req.params.teamId || req.params.id || req.query.teamId;

    if (!teamId) {
      return res.status(400).json({ status: 'ERROR', message: 'Plan kontrolü için teamId gereklidir.' });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({ status: 'ERROR', message: 'Takım bulunamadı.' });
    }

    const planContext = (team.settings as any)?.planContext || {};
    const planId      = planContext.planId;

    let availableFeatures: string[] = [];

    if (planId) {
      const plan = await prisma.plan.findUnique({ where: { id: planId } });
      availableFeatures = plan?.feature_keys || [];
    }

    if (!availableFeatures.includes(featureKey)) {
      return res.status(403).json({
        status:  'PLAN_LIMIT',
        message: `Bu özellik mevcut planınızda bulunmamaktadır. Plan yükseltmek için abonelik sayfasını ziyaret edin.`,
        missingFeature: featureKey,
        currentPlan: planContext.planName || 'Free',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { planGuard };
export {};
