import rateLimit from 'express-rate-limit';
import { config } from '../config/env';

export const rateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max:      config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    status:  'ERROR',
    message: 'Çok fazla istek gönderildi. Lütfen bir süre bekleyin.',
  },
});
