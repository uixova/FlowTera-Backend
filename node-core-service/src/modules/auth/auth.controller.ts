const authService = require('./auth.service');

class AuthController {
  async login(req: any, res: any, next: any) {
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

  async verify(req: any, res: any, next: any) {
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

  async signup(req: any, res: any, next: any) {
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
