import type { RouteConfig } from '../types/gateway.types';

// Hangi prefix hangi servise gider.
// /api → node-core-service (yazma, auth, iş mantığı)
// /ml  → python-ml-service (sadece okuma, OCR, analiz)
export const ROUTE_MAP: RouteConfig[] = [
  { prefix: '/ml',  target: 'python' },
  { prefix: '/api', target: 'node'   },
];
