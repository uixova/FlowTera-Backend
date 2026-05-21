const dotenv = require('dotenv');
dotenv.config();

const env = {
  PORT:           process.env.PORT           || '3001',
  NODE_ENV:       process.env.NODE_ENV       || 'development',
  DATABASE_URL:   process.env.DATABASE_URL   || '',
  JWT_SECRET:     process.env.JWT_SECRET     || 'flowtera-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN:    process.env.CORS_ORIGIN    || '*',
  REDIS_URL:      process.env.REDIS_URL      || 'redis://localhost:6379',
};

module.exports = env;
export {};
