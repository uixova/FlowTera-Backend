const logger = require('../utils/logger');

// Özel Uygulama Hatası 
// throw new AppError('Mesaj', 400) — controller'lardan fırlatılabilir
class AppError extends Error {
  constructor(public message: string, public statusCode = 400) {
    super(message);
    this.name = 'AppError';
  }
}

// Prisma Hata Kodları → HTTP Durum Kodu
const PRISMA_CODE_MAP: Record<string, { status: number; msg: string }> = {
  P2002: { status: 409, msg: 'Bu kayıt zaten mevcut. (benzersizlik ihlali)' },
  P2025: { status: 404, msg: 'İlgili kayıt bulunamadı.'                    },
  P2003: { status: 400, msg: 'İlişkili kayıt bulunamadı. (foreign key)'    },
  P2000: { status: 400, msg: 'Girilen değer alan boyutunu aşıyor.'          },
  P2014: { status: 400, msg: 'Gerekli ilişki ihlali.'                      },
  P2016: { status: 400, msg: 'Sorgu yorumlama hatası.'                      },
};

// Global Hata Yakalayıcı
// app.ts'de TÜM route'lardan SONRA eklenmeli: app.use(errorHandler)
const errorHandler = (err: any, req: any, res: any, _next: any): void => {
  const isProd = process.env.NODE_ENV === 'production';
  const method = req.method;
  const url    = req.originalUrl;

  // Zod Doğrulama Hatası
  if (err?.name === 'ZodError' || err?.issues) {
    const issues = (err.issues || err.errors || []).map((i: any) => ({
      alan: i.path?.join('.') || 'bilinmiyor',
      hata: i.message,
    }));
    logger.warn(`Doğrulama hatası [${method} ${url}]`, { issues }, 'validate');
    res.status(400).json({ status: 'VALIDATION_ERROR', message: 'Girdi doğrulama başarısız.', errors: issues });
    return;
  }

  // JWT Hatası
  if (err?.name === 'JsonWebTokenError') {
    res.status(401).json({ status: 'ERROR', message: 'Geçersiz token.' });
    return;
  }
  if (err?.name === 'TokenExpiredError') {
    res.status(401).json({ status: 'ERROR', message: 'Token süresi dolmuş. Lütfen tekrar giriş yapın.' });
    return;
  }

  // Prisma Hatası
  if (err?.code && PRISMA_CODE_MAP[err.code]) {
    const mapped = PRISMA_CODE_MAP[err.code];
    logger.dbError(`Prisma ${err.code} [${method} ${url}]`, err);
    res.status(mapped.status).json({ status: 'ERROR', message: mapped.msg });
    return;
  }
  if (err?.name === 'PrismaClientKnownRequestError' || err?.name === 'PrismaClientValidationError') {
    logger.dbError(`Prisma doğrulama hatası [${method} ${url}]`, err);
    res.status(400).json({ status: 'ERROR', message: 'Veritabanı işlemi hatalı.' });
    return;
  }

  // Uygulama Hatası (AppError) 
  if (err?.name === 'AppError') {
    res.status(err.statusCode || 400).json({ status: 'ERROR', message: err.message });
    return;
  }

  // Genel Hata — stack trace sadece server log'a gider, hiçbir zaman response'a eklenmez
  const statusCode = err?.statusCode || err?.status || 500;
  logger.httpError(method, url, statusCode, err?.message || 'Bilinmeyen sunucu hatası');
  logger.error(`Sunucu hatası [${method} ${url}]`, err, 'http');

  res.status(statusCode).json({
    status:  'ERROR',
    message: isProd ? 'Sunucuda bir hata oluştu.' : (err?.message || 'Bilinmeyen hata'),
  });
};

module.exports = { errorHandler, AppError };
export {};
