import dotenv from 'dotenv';
import type { GatewayConfig } from '../types/gateway.types';

dotenv.config();

const required = (key: string): string => {
  const val = process.env[key];
  if (!val) throw new Error(`Zorunlu çevre değişkeni eksik: ${key}`);
  return val;
};

export const config: GatewayConfig = {
  port:               parseInt(process.env['PORT'] ?? '3002', 10),
  nodeServiceUrl:     process.env['NODE_SERVICE_URL']   ?? 'http://localhost:3001',
  pythonServiceUrl:   process.env['PYTHON_SERVICE_URL'] ?? 'http://localhost:8000',
  internalApiKey:     required('INTERNAL_API_KEY'),
  rateLimitWindowMs:  parseInt(process.env['RATE_LIMIT_WINDOW_MS'] ?? '60000', 10),
  rateLimitMax:       parseInt(process.env['RATE_LIMIT_MAX']       ?? '100',   10),
};
