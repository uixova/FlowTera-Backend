const resetService = require('./reset.service');

class ResetController {
  // POST /auth/forgot-password
  async forgotPassword(req: any, res: any, next: any) {
    try {
      const { email, phone, channel } = req.body;
      const identifier = channel === 'sms' ? phone : email;

      if (!identifier) {
        return res.status(400).json({
          status:  'ERROR',
          message: `${channel === 'sms' ? 'Telefon numarası' : 'E-posta adresi'} zorunludur.`,
        });
      }

      const result = await resetService.requestReset(identifier, channel || 'email');
      return res.status(200).json({ status: 'OK', ...result });
    } catch (error) {
      next(error);
    }
  }

  // GET /auth/reset-password/validate?token=xxx
  async validateResetToken(req: any, res: any, next: any) {
    try {
      const { token } = req.query;
      if (!token) {
        return res.status(400).json({ status: 'ERROR', message: 'Token zorunludur.' });
      }
      const result = await resetService.validateToken(token);
      return res.status(200).json({ status: 'OK', ...result });
    } catch (error) {
      next(error);
    }
  }

  // POST /auth/reset-password
  async resetPassword(req: any, res: any, next: any) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          status:  'ERROR',
          message: 'Token ve yeni şifre zorunludur.',
        });
      }

      if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
        return res.status(400).json({
          status:  'ERROR',
          message: 'Şifre en az 8 karakter, büyük-küçük harf ve rakam içermelidir.',
        });
      }

      const result = await resetService.resetPassword(token, newPassword);
      return res.status(200).json({ status: 'OK', ...result });
    } catch (error: any) {
      return res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }
}

module.exports = new ResetController();
export {};
