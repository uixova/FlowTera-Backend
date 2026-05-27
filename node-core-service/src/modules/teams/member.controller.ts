const memberService = require('./member.service');
const prisma        = require('../../config/prisma');

// identifier → userId çözümü: email / username / userId kabul eder
const resolveIdentifier = async (identifier: string): Promise<string | null> => {
  if (!identifier) return null;
  const id = identifier.trim();

  // Email içeriyorsa e-posta ile ara
  if (id.includes('@')) {
    const user = await prisma.user.findUnique({ where: { email: id.toLowerCase() }, select: { id: true } });
    return user?.id || null;
  }

  // Önce doğrudan userId dene, bulamazsa username olarak ara
  const byId = await prisma.user.findUnique({ where: { id }, select: { id: true } }).catch(() => null);
  if (byId) return byId.id;

  const byUsername = await prisma.user.findUnique({ where: { username: id }, select: { id: true } }).catch(() => null);
  return byUsername?.id || null;
};

class MemberController {
  async updateMember(req: any, res: any, next: any) {
    try {
      const { teamId, userId } = req.params;
      // Frontend: { role, restrictions } → Backend schema: { roleName, permissions }
      const roleName    = req.body.roleName    ?? req.body.role;
      const permissions = req.body.permissions ?? req.body.restrictions ?? [];

      if (!roleName)
        return res.status(400).json({ status: 'ERROR', message: 'roleName zorunludur.' });

      const adminName = req.user?.name || req.user?.email || 'Admin';
      const result = await memberService.updateMember(teamId, userId, roleName, permissions, adminName);
      res.status(200).json({ status: 'OK', data: result });
    } catch (error: any) {
      res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }

  async removeMember(req: any, res: any, next: any) {
    try {
      const { teamId, userId } = req.params;
      const adminName = req.user?.name || req.user?.email || 'Admin';
      const result = await memberService.removeMember(teamId, userId, adminName);
      res.status(200).json({ status: 'OK', ...result });
    } catch (error: any) {
      res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }

  async addMember(req: any, res: any, next: any) {
    try {
      const { teamId } = req.params;
      // Frontend gönderir: { identifier, role, restrictions }
      // Eski format da desteklenir: { userId, roleName, permissions }
      const roleName    = req.body.roleName    ?? req.body.role    ?? 'Member';
      const permissions = req.body.permissions ?? req.body.restrictions ?? [];

      // userId doğrudan geldiyse kullan, yoksa identifier'ı çöz
      let userId = req.body.userId;
      if (!userId && req.body.identifier) {
        userId = await resolveIdentifier(req.body.identifier);
        if (!userId) {
          return res.status(404).json({
            status:  'ERROR',
            message: `"${req.body.identifier}" e-posta veya kullanıcı adı bulunamadı.`,
          });
        }
      }

      if (!userId)
        return res.status(400).json({ status: 'ERROR', message: 'userId veya identifier zorunludur.' });

      const adminId   = req.user?.userId || '';
      const adminName = req.user?.name || req.user?.email || 'Admin';
      const result = await memberService.addMember(teamId, userId, roleName, permissions, adminId, adminName);
      res.status(201).json({ status: 'OK', data: result });
    } catch (error: any) {
      res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }

  async leaveTeam(req: any, res: any, next: any) {
    try {
      const { teamId } = req.params;
      const userId     = req.user.userId;
      const result     = await memberService.leaveTeam(teamId, userId);
      res.status(200).json({ status: 'OK', ...result });
    } catch (error: any) {
      res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }
}

module.exports = new MemberController();
export {};
