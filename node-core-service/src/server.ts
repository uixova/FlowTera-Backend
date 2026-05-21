const http       = require('http');
const app        = require('./app');
const prismaClient              = require('./config/prisma');
const { initWebSocketServer }   = require('./config/websocket');

const PORT   = process.env.PORT || 3001;
const server = http.createServer(app);

// Native WebSocket sunucusu (/ws path'i — frontend'in beklediği protokol)
initWebSocketServer(server);

async function startServer() {
  try {
    await prismaClient.$connect();
    console.log('🐘 PostgreSQL veritabanı bağlantısı başarılı.');

    server.listen(PORT, () => {
      console.log(`🚀 Node Core Service ${PORT} portunda yayında.`);
    });
  } catch (error) {
    console.error('💥 Sunucu başlatılırken hata oluştu:', error);
    await prismaClient.$disconnect();
    process.exit(1);
  }
}

startServer();