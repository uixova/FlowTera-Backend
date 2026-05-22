import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { correlationId }  from './middlewares/correlationId';
import { requestLogger }  from './middlewares/requestLogger';
import { rateLimiter }    from './middlewares/rateLimiter';
import { errorHandler }   from './middlewares/errorHandler';
import { nodeProxy }      from './proxy/nodeProxy';
import { pythonProxy }    from './proxy/pythonProxy';

const app = express();

app.use(helmet());
app.use(cors());
app.use(correlationId);
app.use(requestLogger);
app.use(rateLimiter);

// Sağlık kontrolü — proxy olmadan doğrudan yanıt
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', service: 'api-gateway' });
});

// Rota yönlendirme — pathFilter proxy içinde tanımlı, prefix korunur
app.use(pythonProxy);
app.use(nodeProxy);

// Tanımsız rota
app.use((_req, res) => {
  res.status(404).json({ status: 'ERROR', message: 'Rota bulunamadı.' });
});

app.use(errorHandler);

export { app };
