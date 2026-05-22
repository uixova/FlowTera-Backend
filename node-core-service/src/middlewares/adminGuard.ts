const logger = require('../utils/logger');

// Admin Rol Doğrulayıcı
// teamGuard çalıştıktan sonra req.teamMember dolu olmalıdır.
// roleName === 'Admin' kontrolü yapar; başarısızsa 403 döner.
//
// Kullanım: router.patch('/:id/status', authenticate, teamGuard, adminGuard, controller)
const adminGuard = (req: any, res: any, next: any): void => {
  const member = req.teamMember;

  if (!member) {
    res.status(403).json({ status: 'ERROR', message: 'Takım üyeliği doğrulanmadı. teamGuard önce çalışmalıdır.' });
    return;
  }

  if (member.roleName !== 'Admin') {
    logger.warn(
      `Admin yetkisi reddedildi [${req.method} ${req.originalUrl}]`,
      { userId: req.user?.userId, teamId: member.teamId, roleName: member.roleName },
      'security',
    );
    res.status(403).json({
      status:  'ERROR',
      message: 'Bu işlem yalnızca takım yöneticileri (Admin) tarafından yapılabilir.',
    });
    return;
  }

  next();
};

module.exports = { adminGuard };
export {};
