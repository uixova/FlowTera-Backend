import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

// Her isteğe izlenebilirlik için benzersiz ID ekler.
export const correlationId = (req: Request, res: Response, next: NextFunction): void => {
  const id = (req.headers['x-correlation-id'] as string) || randomUUID();
  req.headers['x-correlation-id'] = id;
  res.setHeader('X-Correlation-ID', id);
  next();
};
