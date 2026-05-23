const { PrismaClient } = require('@prisma/client');

// Bağlantı havuzu ayarları — containerlar arası bağlantı stabilitesi için
// connection_limit: eşzamanlı DB bağlantısı sayısı (container başına 5 önerilir)
// pool_timeout: havuzdan bağlantı beklenecek max süre (saniye)
// connect_timeout: DB'ye bağlanma zaman aşımı (saniye)
const buildDatabaseUrl = (): string => {
  const base  = process.env.DATABASE_URL || '';
  const limit = process.env.DATABASE_POOL_LIMIT || '5';
  const ssl   = process.env.DATABASE_SSL === 'true';

  const separator = base.includes('?') ? '&' : '?';
  let url = `${base}${separator}connection_limit=${limit}&pool_timeout=15&connect_timeout=10`;
  if (ssl) url += '&sslmode=prefer';
  return url;
};

const prisma = new PrismaClient({
  datasourceUrl: buildDatabaseUrl(),
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
});

// Graceful shutdown — container stop sinyallerinde bağlantıları temiz kapat
const gracefulShutdown = async (): Promise<void> => {
  await prisma.$disconnect();
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT',  gracefulShutdown);

module.exports = prisma;
