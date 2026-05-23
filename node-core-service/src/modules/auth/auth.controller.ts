const authService = require('./auth.service');

class AuthController {
  // LOGIN adım 1 — kimlik doğrula, OTP mail gönder
  async login(req: any, res: any) {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ status: 'ERROR', message: 'E-posta ve şifre zorunludur.' });

      const result = await authService.validateAndStartVerification(email, password);
      return res.status(200).json({ status: 'OK', ...result });
    } catch (error: any) {
      return res.status(401).json({ status: 'ERROR', message: error.message });
    }
  }

  // LOGIN adım 2 — OTP doğrula, JWT döndür
  async verify(req: any, res: any) {
    try {
      const { email, code } = req.body;
      if (!email || !code)
        return res.status(400).json({ status: 'ERROR', message: 'E-posta ve kod zorunludur.' });

      const result = await authService.verifyLoginCode(email, code);
      return res.status(200).json({ status: 'OK', ...result });
    } catch (error: any) {
      return res.status(401).json({ status: 'ERROR', message: error.message });
    }
  }

  // SIGNUP adım 1 — kayıt verisini al, OTP mail gönder
  async initiateSignup(req: any, res: any) {
    try {
      const result = await authService.initiateSignup(req.body);
      return res.status(200).json({ status: 'OK', ...result });
    } catch (error: any) {
      return res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }

  // SIGNUP adım 2 — OTP doğrula, kullanıcı oluştur
  async verifySignup(req: any, res: any) {
    try {
      const { email, code } = req.body;
      if (!email || !code)
        return res.status(400).json({ status: 'ERROR', message: 'E-posta ve kod zorunludur.' });

      const result = await authService.verifySignupOtp(email, code);
      return res.status(201).json({ status: 'OK', ...result });
    } catch (error: any) {
      return res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }

  // Doğrudan kayıt (admin/test amaçlı)
  async signup(req: any, res: any) {
    try {
      const result = await authService.registerUser(req.body);
      return res.status(201).json({ status: 'OK', ...result });
    } catch (error: any) {
      return res.status(400).json({ status: 'ERROR', message: error.message });
    }
  }
}

module.exports = new AuthController();
export {};
