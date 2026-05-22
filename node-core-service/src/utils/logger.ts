import * as fs   from 'fs';
import * as path from 'path';

// Log Dizini
// Çalışma dizinine göre logs/ klasörü otomatik oluşturulur
const LOG_DIR  = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');
const ERR_FILE = path.join(LOG_DIR, 'error.log');  // Sadece hata kayıtları

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Tipler 
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  ts:      string;      // ISO timestamp
  level:   LogLevel;
  msg:     string;
  source?: string;      // Nereden geldiği: 'middleware', 'ws', 'python' vb.
  data?:   unknown;     // Ek bağlam (obje, hata detayı)
}

// Çekirdek Yazıcı 
// Her satır ayrı bir JSON nesnesi (JSON Lines formatı — kolayca grep'lenebilir)
const write = (entry: LogEntry): void => {
  const line = JSON.stringify(entry) + '\n';
  try {
    fs.appendFileSync(LOG_FILE, line, 'utf8');
    // ERROR seviyesi → ayrıca error.log'a da yaz
    if (entry.level === 'ERROR') {
      fs.appendFileSync(ERR_FILE, line, 'utf8');
    }
  } catch {
    // Log yazılamıyorsa konsola düş — uygulamayı çökertme
    process.stderr.write('[LOGGER HATA] Dosyaya yazılamadı: ' + line);
  }
};

const buildEntry = (level: LogLevel, msg: string, source?: string, data?: unknown): LogEntry => ({
  ts:     new Date().toISOString(),
  level,
  msg,
  ...(source && { source }),
  ...(data !== undefined && { data }),
});

// Public API
const logger = {
  debug: (msg: string, data?: unknown, source?: string) => {
    if (process.env.NODE_ENV !== 'production') {
      write(buildEntry('DEBUG', msg, source, data));
    }
  },

  info: (msg: string, data?: unknown, source?: string) => {
    write(buildEntry('INFO', msg, source, data));
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[INFO] ${msg}`);
    }
  },

  warn: (msg: string, data?: unknown, source?: string) => {
    write(buildEntry('WARN', msg, source, data));
    console.warn(`[UYARI] ${msg}`);
  },

  error: (msg: string, err?: unknown, source?: string) => {
    const data = err instanceof Error
      ? { message: err.message, stack: err.stack }
      : err;
    write(buildEntry('ERROR', msg, source, data));
    console.error(`[HATA] ${msg}`, err instanceof Error ? err.message : err);
  },

  // Özel Kanallar 

  // Node ↔ Python ML servisi iletişim hataları
  pythonError: (msg: string, err?: unknown) => {
    logger.error(`[Python-ML] ${msg}`, err, 'python');
  },

  // WebSocket hataları
  wsError: (msg: string, err?: unknown) => {
    logger.error(`[WebSocket] ${msg}`, err, 'ws');
  },

  // HTTP istek hataları (middleware seviyesi)
  httpError: (method: string, url: string, status: number, msg: string) => {
    write(buildEntry('ERROR', msg, 'http', { method, url, status }));
  },

  // Prisma / veritabanı hataları
  dbError: (msg: string, err?: unknown) => {
    logger.error(`[Veritabanı] ${msg}`, err, 'database');
  },
};

module.exports = logger;
export {};
