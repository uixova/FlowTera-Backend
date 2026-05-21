const prisma = require('../config/prisma');

// Deny-list tabanlı RBAC middleware factory.
// permissionKey, usePermissions.ts'teki PermissionId değerlerinden biri olmalıdır.
// Eğer kullanıcının TeamMember.permissions dizisinde bu key varsa → 403 döner.
// Admin'ler genellikle boş deny list ile gelir → her şeye erişebilir.
//
// Kullanım: router.delete('/:id', authenticate, teamGuard, rbac('member_remove'), controller.remove)
const rbac = (permissionKey: string) => async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.userId;
    const teamId = req.params.teamId || req.params.id || req.query.teamId;

    if (!userId || !teamId) {
      return res.status(400).json({ status: 'ERROR', message: 'Yetki kontrolü için teamId gereklidir.' });
    }

    const member = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });

    if (!member) {
      return res.status(403).json({ status: 'ERROR', message: 'Bu takımda üyeliğiniz bulunmamaktadır.' });
    }

    // Deny-list: izin bu listede varsa erişim reddedilir
    const isDenied = Array.isArray(member.permissions) && member.permissions.includes(permissionKey);
    if (isDenied) {
      return res.status(403).json({
        status: 'ERROR',
        message: 'Bu işlem için yetkiniz bulunmamaktadır.',
        deniedPermission: permissionKey,
      });
    }

    // Rolü req'e ekle — sonraki middleware/controller'lar kullanabilir
    req.teamMember = member;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { rbac };
export {};
