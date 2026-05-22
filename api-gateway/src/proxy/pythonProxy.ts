import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config/env';

// /ml/* → python-ml-service (sadece okuma, OCR, analiz)
// pathFilter ile prefix korunur — express app.use('/ml') yolu kesmez.
// İç servis anahtarı her istekte header olarak eklenir.
export const pythonProxy = createProxyMiddleware({
  target:       config.pythonServiceUrl,
  changeOrigin: true,
  pathFilter:   '/ml',
  on: {
    proxyReq: (proxyReq) => {
      proxyReq.setHeader('X-Internal-API-Key', config.internalApiKey);
    },
    error: (err, _req, res) => {
      console.error(`[Gateway] Python proxy hatası: ${(err as Error).message}`);
      const httpRes = res as import('http').ServerResponse;
      if (typeof httpRes.writeHead === 'function' && !httpRes.headersSent) {
        httpRes.writeHead(503, { 'Content-Type': 'application/json' });
        httpRes.end(JSON.stringify({ status: 'ERROR', message: 'ML servisi ulaşılamaz.' }));
      }
    },
  },
});
