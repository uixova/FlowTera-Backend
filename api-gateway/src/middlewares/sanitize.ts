import { Request, Response, NextFunction } from 'express';

const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB

// Query string ve path'te SQL/XSS/path-traversal açıklarını durdurur.
// Body bu katmanda parse edilmez — uygulama katmanı (node-core Zod) işler.

const SQL_RE = [
  /'\s*(OR|AND)\s+'\d+'\s*=\s*'\d+/gi,
  /;\s*(DROP|DELETE|TRUNCATE|ALTER|INSERT|UPDATE)\s+/gi,
  /UNION\s+(?:ALL\s+)?SELECT\s/gi,
  /--\s*$/gm,
  /\/\*[\s\S]*?\*\//gm,
  /\bEXEC(?:UTE)?\s*\(/gi,
  /\bxp_\w+/gi,
];

const XSS_RE = [
  /<script/gi,
  /javascript\s*:/gi,
  /on\w+\s*=/gi,
  /data\s*:\s*text\/html/gi,
  /vbscript\s*:/gi,
];

const PATH_TRAVERSAL_RE = /\.\.(\/|\\|%2F|%5C)/gi;

function isClean(value: string): boolean {
  return (
    !SQL_RE.some(r => { r.lastIndex = 0; return r.test(value); }) &&
    !XSS_RE.some(r => { r.lastIndex = 0; return r.test(value); }) &&
    !PATH_TRAVERSAL_RE.test(value)
  );
}

export function sanitizeRequest(req: Request, res: Response, next: NextFunction): void {
  // 1. Content-Length kontrolü — 2 MB'ı aşan istekleri reddet
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > MAX_BODY_BYTES) {
    res.status(413).json({ status: 'ERROR', message: 'İstek gövdesi çok büyük (maks. 2 MB).' });
    return;
  }

  // 2. Path traversal kontrolü
  if (!isClean(req.path)) {
    res.status(400).json({ status: 'ERROR', message: 'Geçersiz istek yolu.' });
    return;
  }

  // 3. Query parametreleri kontrolü
  for (const [key, val] of Object.entries(req.query)) {
    const str = Array.isArray(val) ? val.join('') : String(val ?? '');
    if (!isClean(key) || !isClean(str)) {
      res.status(400).json({ status: 'ERROR', message: 'Geçersiz sorgu parametresi.' });
      return;
    }
  }

  // 4. Hassas header kontrolü (User-Agent, Referer, X-* özel başlıklar)
  const headersToCheck = ['user-agent', 'referer', 'x-forwarded-for', 'x-real-ip'];
  for (const h of headersToCheck) {
    const val = req.headers[h];
    if (val && !isClean(String(val))) {
      res.status(400).json({ status: 'ERROR', message: 'Geçersiz istek başlığı.' });
      return;
    }
  }

  next();
}
