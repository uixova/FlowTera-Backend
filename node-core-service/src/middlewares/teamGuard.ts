const prisma = require('../config/prisma');
const logger = require('../utils/logger');

// Takım Üyelik Doğrulayıcı
// Tek DB sorgusuyla hem üyeliği hem takımın silinmemiş olduğunu doğrular.
//
// teamId: req.params.teamId | req.query.teamId | req.body.teamId sırasıyla
// req.params.id dahil edilmez — expense/trip rotalarında :id kaynak ID'sidir.
//
// Kullanım: router.get('/:teamId/members', authenticate, teamGuard, controller)
const teamGuard = async (req: any, res: any, next: any): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const teamId = req.params.teamId || req.query.teamId || req.body?.teamId;

    if (!userId || !teamId) {
      res.status(400).json({ status: 'ERROR', message: 'Takım kimliği bulunamadı.' });
      return;
    }

    // Tek sorguda hem üyelik hem takım durumu kontrol edilir
    const member = await prisma.teamMember.findUnique({
      where:   { userId_teamId: { userId, teamId } },
      include: { team: { select: { isDeleted: true } } },
    });

    if (!member) {
      logger.warn(
        `Yetkisiz takım erişimi [${req.method} ${req.originalUrl}]`,
        { userId, teamId },
        'security',
      );
      res.status(403).json({
        status:  'ERROR',
        message: 'Bu takıma erişim yetkiniz bulunmamaktadır.',
      });
      return;
    }

    if (member.team?.isDeleted) {
      res.status(404).json({ status: 'ERROR', message: 'Takım bulunamadı veya silinmiş.' });
      return;
    }

    // team alanı controller'larda gereksiz — sadece middleware'e özel
    const { team: _team, ...memberData } = member;
    req.teamMember = memberData; // { userId, teamId, roleName, permissions }
    next();

  } catch (error) {
    next(error);
  }
};

module.exports = { teamGuard };
export {};
