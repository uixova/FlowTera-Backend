import type { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const correlationId = req.headers['x-correlation-id'];
  console.error(`[Gateway ERROR] ${req.method} ${req.path} — ${err.message}`, {
    correlationId,
    stack: err.stack,
  });
  res.status(502).json({
    status:  'ERROR',
    message: 'Ağ geçidi hatası.',
    correlationId,
  });
};
