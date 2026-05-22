import type { Request, Response, NextFunction } from 'express';

export type ExpressHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

export interface RouteConfig {
  prefix: string;
  target: 'node' | 'python';
  stripPrefix?: boolean;
}

export interface GatewayConfig {
  port: number;
  nodeServiceUrl: string;
  pythonServiceUrl: string;
  internalApiKey: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
}
