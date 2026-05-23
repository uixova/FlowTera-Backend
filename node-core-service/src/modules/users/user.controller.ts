const userService   = require('./user.service');
const { MAX_PAGE_SIZE } = require('../../config/constants');

const ownerOnly = (req: any, res: any): boolean => {
  if (req.user?.userId !== req.params.id) {
    res.status(403).json({ status: 'ERROR', message: 'Bu işlem yalnızca hesap sahibi tarafından yapılabilir.' });
    return false;
  }
  return true;
};

class UserController {
  async listAll(req: any, res: any, next: any) {
    try {
      const page     = Math.max(1, parseInt(req.query.page     as string) || 1);
      const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.pageSize as string) || 20));
      const teamId   = req.query.teamId as string | undefined;
      const result   = await userService.getAllUsers(page, pageSize, teamId);
      res.status(200).json({ status: 'OK', ...result });
    } catch (error) { next(error); }
  }

  async getProfile(req: any, res: any, next: any) {
    try {
      const user = await userService.getUserById(req.params.id);
      if (!user) return res.status(404).json({ status: 'ERROR', message: 'Kullanıcı bulunamadı.' });
      res.status(200).json({ status: 'OK', data: user });
    } catch (error) { next(error); }
  }

  async updateProfile(req: any, res: any, next: any) {
    try {
      if (!ownerOnly(req, res)) return;
      const user = await userService.updateProfile(req.params.id, req.body);
      res.status(200).json({ status: 'OK', data: user });
    } catch (error: any) {
      res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }

  async updateSettings(req: any, res: any, next: any) {
    try {
      if (!ownerOnly(req, res)) return;
      const user = await userService.updateSettings(req.params.id, req.body);
      res.status(200).json({ status: 'OK', data: user });
    } catch (error) { next(error); }
  }

  async changePassword(req: any, res: any, next: any) {
    try {
      if (!ownerOnly(req, res)) return;
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword)
        return res.status(400).json({ status: 'ERROR', message: 'Mevcut ve yeni şifre zorunludur.' });
      const result = await userService.changePassword(req.params.id, currentPassword, newPassword);
      res.status(200).json({ status: 'OK', ...result });
    } catch (error: any) {
      res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }

  async deleteAccount(req: any, res: any, next: any) {
    try {
      if (!ownerOnly(req, res)) return;
      const result = await userService.deleteAccount(req.params.id);
      res.status(200).json({ status: 'OK', ...result });
    } catch (error: any) {
      res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }
}

module.exports = new UserController();
export {};
