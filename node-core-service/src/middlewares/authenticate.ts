const { verifyToken } = require('../utils/jwt');

const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'ERROR', message: 'Yetkisiz erişim. Token bulunamadı.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = verifyToken(token); // { userId, email }
    next();
  } catch {
    return res.status(401).json({ status: 'ERROR', message: 'Geçersiz veya süresi dolmuş token.' });
  }
};

module.exports = { authenticate };
export {};
