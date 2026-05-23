const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('[FATAL] JWT_SECRET eksik veya çok kısa (min 32 karakter). Sunucu durduruluyor.');
  process.exit(1);
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (userId: string, email: string): string =>
  jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const verifyToken = (token: string): { userId: string; email: string } =>
  jwt.verify(token, JWT_SECRET) as { userId: string; email: string };

module.exports = { generateToken, verifyToken };
export {};
