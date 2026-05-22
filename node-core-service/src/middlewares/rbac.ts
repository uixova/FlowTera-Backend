const prisma = require('../config/prisma');
const logger = require('../utils/logger');

// Deny-List Tabanlı RBAC Middleware Factory
// permissionKey: usePermissions.ts'teki PermissionId değerlerinden biri olmalıdır.
// Eğer kullanıcının TeamMember.permissions dizisinde bu key varsa → 403 döner.
// Admin'lerin deny listesi HER ZAMAN boştur — her şeye erişebilirler.
//
// Kullanım: router.delete('/:id', authenticate, teamGuard, rbac('member_remove'), controller)
//
// NOT: teamGuard çalıştıktan sonra req.teamMember zaten dolu olabilir.
//      Varsa tekrar DB sorgusu yapmaktan kaçınılır.
const rbac = (permissionKey: string) => async (req: any, res: any, next: any): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const teamId = req.params.teamId || req.params.id || req.query.teamId;

    if (!userId || !teamId) {
      res.status(400).json({ status: 'ERROR', message: 'Yetki kontrolü için teamId gereklidir.' });
      return;
    }

    // teamGuard önceden çalıştıysa mevcut üye verisini kullan
    const member = req.teamMember ?? await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });

    if (!member) {
      res.status(403).json({ status: 'ERROR', message: 'Bu takımda üyeliğiniz bulunmamaktadır.' });
      return;
    }

    // Deny-list: izin bu listede varsa erişim reddedilir
    const isDenied = Array.isArray(member.permissions) && member.permissions.includes(permissionKey);
    if (isDenied) {
      logger.warn(
        `RBAC reddi: "${permissionKey}" [${req.method} ${req.originalUrl}]`,
        { userId, teamId, roleName: member.roleName },
        'security',
      );
      res.status(403).json({
        status:           'ERROR',
        message:          'Bu işlem için yetkiniz bulunmamaktadır.',
        deniedPermission: permissionKey,
      });
      return;
    }

    // Sonraki katmanlar için üye bilgisini req'e ekle
    req.teamMember = member;
    next();

  } catch (error) {
    next(error);
  }
};

module.exports = { rbac };
export {};
