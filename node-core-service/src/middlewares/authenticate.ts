const { verifyToken } = require('../utils/jwt');
const logger          = require('../utils/logger');

// Başarısız Giriş Sayacı (Bellek içi, üretimde Redis'e taşı)
// IP başına maksimum 20 başarısız token girişimi / dakika
// Aşıldığında 429 döner
const failedAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_FAILS      = 20;
const WINDOW_MS      = 60_000; // 1 dakika

// Süresi dolmuş kayıtları her 5 dakikada temizle — bellek sızıntısını önler
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of failedAttempts) {
    if (now > record.resetAt) failedAttempts.delete(ip);
  }
}, 5 * 60_000).unref(); // .unref(): bu interval süreci canlı tutmaz

const isRateLimited = (ip: string): boolean => {
  const now    = Date.now();
  const record = failedAttempts.get(ip);

  if (!record || now > record.resetAt) {
    // Pencere sıfırla
    failedAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  record.count++;
  if (record.count > MAX_FAILS) {
    logger.warn(`Token rate limit aşıldı`, { ip, count: record.count }, 'security');
    return true;
  }
  return false;
};

const clearFailedAttempt = (ip: string): void => {
  failedAttempts.delete(ip);
};

// JWT Doğrulama Middleware 
// Authorization: Bearer <token> header'ını doğrular.
// Başarılıysa: req.user = { userId, email }
// Başarısızsa: 401 veya 429 döner ve loglar.
const authenticate = (req: any, res: any, next: any): void => {
  const ip         = req.ip || req.socket?.remoteAddress || 'bilinmiyor';
  const authHeader = req.headers.authorization;

  // Token yoksa hızlıca reddet (rate limit saymadan)
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ status: 'ERROR', message: 'Yetkisiz erişim. Token bulunamadı.' });
    return;
  }

  // Başarısız deneme sayısı aşıldıysa blokla
  if (isRateLimited(ip)) {
    res.status(429).json({
      status:  'ERROR',
      message: 'Çok fazla geçersiz istek. Lütfen bir dakika bekleyin.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);

    if (!payload?.userId) {
      throw new Error('Geçersiz token payload.');
    }

    // Token geçerliyse başarısız sayacı sıfırla
    clearFailedAttempt(ip);

    // req.user genişletmesi — express.d.ts'e tip eklenebilir
    req.user = { userId: payload.userId, email: payload.email };
    next();

  } catch (err: any) {
    // Başarısız girişimi kaydet ve logla
    isRateLimited(ip); // sayacı artır

    const isExpired = err?.name === 'TokenExpiredError';
    logger.warn(
      `Geçersiz token girişimi [${req.method} ${req.originalUrl}]`,
      { ip, error: err?.name || err?.message },
      'security',
    );

    res.status(401).json({
      status:  'ERROR',
      message: isExpired
        ? 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.'
        : 'Geçersiz token.',
    });
  }
};

// Opsiyonel Kimlik Doğrulama
// Token varsa doğrular ve req.user'ı doldurur, yoksa geçişe izin verir.
// Genel (public) + kişisel (private) içeriklerin aynı endpoint'ten sunulduğu yerler için.
const optionalAuthenticate = (req: any, _res: any, next: any): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) { next(); return; }

  try {
    const token   = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (payload?.userId) req.user = { userId: payload.userId, email: payload.email };
  } catch {
    // Token geçersizse sessizce geç — kritik değil
  }
  next();
};

module.exports = { authenticate, optionalAuthenticate };
export {};
