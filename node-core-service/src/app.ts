type Application = import('express').Application;
type ExpressRequest = import('express').Request;
type ExpressResponse = import('express').Response;

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Merkezi rota dağıtıcısını içeri alıyoruz
const mainRouter = require('./routes');

dotenv.config();

const application: Application = express();

// Global Middlewareler
application.use(helmet());
application.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
// Stripe webhook raw body'ye ihtiyaç duyar — JSON ayrıştırılmadan önce buffer olarak saklanır
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

// Sağlık Kontrolü (Health Check) Endpointi
application.get('/health', (req: ExpressRequest, res: ExpressResponse) => {
  res.status(200).json({ status: 'OK', service: 'Node Core Service', timestamp: new Date() });
});

// Tüm API rotalarını tek bir hattan dışarı açıyoruz
application.use('/api/v1', mainRouter);

module.exports = application;

export {};