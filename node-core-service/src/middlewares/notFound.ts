const logger = require('../utils/logger');

// 404 — Tanımsız Rota 
// Tüm route tanımlarından SONRA, errorHandler'dan ÖNCE eklenmeli.
// Kötü niyetli tarama girişimlerini de yakalar ve loglar.
const notFound = (req: any, res: any): void => {
  const { method, originalUrl, ip } = req;

  // Sık hedeflenen yollar muhtemelen tarama — logla
  const suspiciousPaths = ['/wp-admin', '/.env', '/config', '/admin', '/phpmyadmin', '/xmlrpc'];
  const isSuspicious    = suspiciousPaths.some(p => originalUrl.toLowerCase().startsWith(p));

  if (isSuspicious) {
    logger.warn(`Şüpheli 404 isteği: ${method} ${originalUrl}`, { ip }, 'security');
  }

  res.status(404).json({
    status:  'ERROR',
    message: `İstenen rota bulunamadı: ${method} ${originalUrl}`,
  });
};

module.exports = { notFound };
export {};
