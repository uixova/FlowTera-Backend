// XSS ve injection pattern'larını req.body string değerlerinden temizler.
// Zod validation'dan ÖNCE çalışır; Zod enum kontrolüyle birlikte çift katman sağlar.

const XSS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,   // onerror="...", onclick="..."
  /on\w+\s*=\s*[^\s>]*/gi,
  /<\s*\/?\s*(script|iframe|object|embed|form|input|link|meta|style|svg|img)[^>]*>/gi,
  /data\s*:\s*text\/html/gi,
  /vbscript\s*:/gi,
];

// SQL injection için sadece açık saldırı desenleri — meşru sorgu parçalarını kesmez
const SQL_PATTERNS = [
  /'\s*(OR|AND)\s+'\d+'\s*=\s*'\d+/gi,      // ' OR '1'='1
  /;\s*(DROP|DELETE|TRUNCATE|ALTER)\s+/gi,    // ; DROP TABLE
  /UNION\s+(?:ALL\s+)?SELECT\s/gi,            // UNION SELECT
  /(?:--\s*$|\/\*[\s\S]*?\*\/)/gm,            // -- comment  /* */
  /\bEXEC(?:UTE)?\s*\(/gi,                    // EXEC(
  /\bxp_\w+/gi,                               // xp_cmdshell
];

function stripXss(value: string): string {
  let out = value;
  for (const pattern of XSS_PATTERNS) {
    out = out.replace(pattern, '');
  }
  return out.trim();
}

function hasSqlInjection(value: string): boolean {
  return SQL_PATTERNS.some(p => p.test(value));
}

function sanitizeValue(val: unknown): { value: unknown; blocked: boolean } {
  if (typeof val !== 'string') return { value: val, blocked: false };

  if (hasSqlInjection(val)) return { value: null, blocked: true };

  return { value: stripXss(val), blocked: false };
}

function sanitizeObject(obj: Record<string, unknown>): { obj: Record<string, unknown>; blocked: boolean } {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const raw = obj[key];
    if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
      const nested = sanitizeObject(raw as Record<string, unknown>);
      if (nested.blocked) return { obj: {}, blocked: true };
      out[key] = nested.obj;
    } else if (Array.isArray(raw)) {
      out[key] = raw; // diziler Zod tarafından doğrulanır
    } else {
      const { value, blocked } = sanitizeValue(raw);
      if (blocked) return { obj: {}, blocked: true };
      out[key] = value;
    }
  }
  return { obj: out, blocked: false };
}

const sanitizeBody = (req: any, res: any, next: any): void => {
  if (!req.body || typeof req.body !== 'object') {
    return next();
  }

  const { obj, blocked } = sanitizeObject(req.body);

  if (blocked) {
    res.status(400).json({
      status:  'ERROR',
      message: 'İstek reddedildi: Geçersiz giriş verisi.',
    });
    return;
  }

  req.body = obj;
  next();
};

module.exports = { sanitizeBody };
export {};
