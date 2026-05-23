const memberService = require('./member.service');

class MemberController {
  async updateMember(req: any, res: any, next: any) {
    try {
      const { teamId, userId }    = req.params;
      const { roleName, permissions } = req.body;
      if (!roleName)
        return res.status(400).json({ status: 'ERROR', message: 'roleName zorunludur.' });

      const adminName = req.user?.name || req.user?.email || 'Admin';
      const result = await memberService.updateMember(teamId, userId, roleName, permissions || [], adminName);
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
      const { teamId }  = req.params;
      const { userId, roleName, permissions } = req.body;
      if (!userId)
        return res.status(400).json({ status: 'ERROR', message: 'userId zorunludur.' });

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
