const jwt = require('jsonwebtoken');

const JWT_SECRET     = process.env.JWT_SECRET     || 'flowtera-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (userId: string, email: string): string =>
  jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const verifyToken = (token: string): { userId: string; email: string } =>
  jwt.verify(token, JWT_SECRET) as { userId: string; email: string };

module.exports = { generateToken, verifyToken };
export {};
