const prisma = require('../config/prisma');

// Kullanıcının istenen takımın üyesi olup olmadığını doğrular.
// teamId: req.params.id, req.params.teamId veya req.query.teamId'den okunur.
//
// Kullanım: router.get('/:id/members', authenticate, teamGuard, controller.getMembers)
const teamGuard = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId;
    const teamId = req.params.teamId || req.params.id || req.query.teamId;

    if (!userId || !teamId) {
      return res.status(400).json({ status: 'ERROR', message: 'Takım kimliği bulunamadı.' });
    }

    const member = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });

    if (!member) {
      return res.status(403).json({
        status: 'ERROR',
        message: 'Bu takıma erişim yetkiniz bulunmamaktadır.',
      });
    }

    req.teamMember = member; // { userId, teamId, roleName, permissions }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { teamGuard };
export {};
