const { PrismaClient }  = require('@prisma/client');
const { PrismaPg }      = require('@prisma/adapter-pg');
const { Pool }          = require('pg');

// Prisma-özel query param'ları (schema=, sslmode=, connection_limit= vb.) pg.Pool'a geçmez
const stripPrismaParams = (url: string): string => {
  try {
    const u = new URL(url);
    ['schema', 'sslmode', 'connection_limit', 'pool_timeout', 'connect_timeout', 'pgbouncer', 'statement_cache_size'].forEach(k => u.searchParams.delete(k));
    return u.toString();
  } catch {
    return url;
  }
};

// Bağlantı havuzu — pg Pool üzerinden Prisma v7 adapter pattern
const buildPool = (): typeof Pool.prototype => {
  const raw   = process.env.DATABASE_URL || '';
  const base  = stripPrismaParams(raw);
  const limit = parseInt(process.env.DATABASE_POOL_LIMIT || '5');
  const ssl   = process.env.DATABASE_SSL === 'true';

  return new Pool({
    connectionString: base,
    max:              limit,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis:       30_000,
    ssl: ssl ? { rejectUnauthorized: false } : false,
  });
};

const pool    = buildPool();
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Graceful shutdown — container stop sinyallerinde bağlantıları temiz kapat
const gracefulShutdown = async (): Promise<void> => {
  await prisma.$disconnect();
  await pool.end();
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT',  gracefulShutdown);

module.exports = prisma;
