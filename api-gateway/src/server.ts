import http from 'http';
import { app }    from './app';
import { config } from './config/env';

const server = http.createServer(app);
const PORT   = config.port;

server.listen(PORT, () => {
  console.log(`🚀 API Gateway port ${PORT}'de çalışıyor`);
  console.log(`   → Node Core  : ${config.nodeServiceUrl}`);
  console.log(`   → Python ML  : ${config.pythonServiceUrl}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} zaten kullanımda. Kapat: kill $(lsof -ti:${PORT})`);
  } else {
    console.error('❌ Sunucu hatası:', err.message);
  }
  process.exit(1);
});

const shutdown = () => {
  console.log('\n🛑 API Gateway kapatılıyor...');
  server.close(() => {
    console.log('✅ API Gateway kapatıldı.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);
