type Application = import('express').Application;
type ExpressRequest = import('express').Request;
type ExpressResponse = import('express').Response;

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const compression = require('compression');
const dotenv      = require('dotenv');

const mainRouter       = require('./routes');
const { errorHandler } = require('./middlewares/errorHandler');
const { notFound }     = require('./middlewares/notFound');

dotenv.config();

const application: Application = express();

// Gzip sıkıştırma — 1KB üzeri JSON yanıtlar için bant genişliği ~70% azalır
// Stripe webhook hariç (raw body gerekli)
application.use(compression({
  filter: (req: any, res: any) => {
    if (req.originalUrl?.includes('/payments/webhook')) return false;
    return compression.filter(req, res);
  },
  level:     6,   // 1-9 arası; 6 = hız/sıkıştırma dengesi
  threshold: 1024, // 1KB altı sıkıştırma yapılmaz
}));

application.use(helmet());
application.use(cors({
  origin:      process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Stripe webhook raw body'ye ihtiyaç duyar
application.use(
  express.json({
    verify: (req: any, _res: any, buf: Buffer) => {
      if (req.originalUrl?.includes('/payments/webhook')) {
        req.rawBody = buf;
      }
    },
  })
);
application.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  application.use(morgan('dev'));
}

// Health Check
application.get('/health', (_req: ExpressRequest, res: ExpressResponse) => {
  res.status(200).json({ status: 'OK', service: 'Node Core Service', timestamp: new Date() });
});

application.use('/api/v1', mainRouter);

// Hata Yönetimi — route'lardan sonra
application.use(notFound);
application.use(errorHandler);

module.exports = application;
export {};
