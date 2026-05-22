import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config/env';

// /api/* → node-core-service (yazma, auth, iş mantığı)
// pathFilter ile prefix korunur — node-core /api/v1/... rotalarını bekler.
// İç servis anahtarı eklenmez — node-core kendi JWT'sini doğrular.
export const nodeProxy = createProxyMiddleware({
  target:       config.nodeServiceUrl,
  changeOrigin: true,
  pathFilter:   '/api',
  on: {
    error: (err, _req, res) => {
      console.error(`[Gateway] Node proxy hatası: ${(err as Error).message}`);
      const httpRes = res as import('http').ServerResponse;
      if (typeof httpRes.writeHead === 'function' && !httpRes.headersSent) {
        httpRes.writeHead(503, { 'Content-Type': 'application/json' });
        httpRes.end(JSON.stringify({ status: 'ERROR', message: 'Node servisi ulaşılamaz.' }));
      }
    },
  },
});
