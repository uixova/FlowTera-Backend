const { WebSocketServer } = require('ws');
const url                 = require('url');
const logger              = require('../utils/logger');

const { verifyWsAuth }        = require('./socket.auth');
const { C, S }                = require('./socket.events');
const {
  joinRooms,
  sendTo,
  emitToUser,
  emitToTeam,
  emitToTeamAdmin,
  emitToTeamRequests,
} = require('./socket.rooms');
const presenceHandler     = require('./handlers/presence.handler');
const notificationHandler = require('./handlers/notification.handler');
const requestHandler      = require('./handlers/request.handler');

// Keepalive ayarları — ağ seviyesinde ölü bağlantı tespiti
// 30s'de bir ping; yanıtsız bağlantı bir sonraki turda terminate edilir (efektif 30-60s timeout)
const HEARTBEAT_INTERVAL_MS = 30_000;

// Her bağlı ws'e isAlive işareti eklenir; pong geldikçe sıfırlanır
const setupHeartbeat = (wss: any): NodeJS.Timeout => {
  return setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) {
        // Önceki heartbeat'te pong gelmedi — bağlantı ölü
        logger.warn('Yanıtsız WS bağlantısı kapatıldı', { userId: ws._userId }, 'ws');
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping(); // Native WS ping (uygulama katmanı değil, protokol katmanı)
    });
  }, HEARTBEAT_INTERVAL_MS);
};

// Mesaj Router
const handleMessage = async (
  ws:      any,
  raw:     Buffer,
  userId:  string,
  teamId:  string,
): Promise<void> => {
  let type: string;
  let payload: any;

  try {
    ({ type, payload } = JSON.parse(raw.toString()));
  } catch {
    sendTo(ws, S.ERROR, { message: 'Geçersiz mesaj formatı.' });
    return;
  }

  try {
    switch (type) {
      case C.NOTIFICATION_DELETE:
        await notificationHandler.onDelete(ws, payload, userId);
        break;

      case C.NOTIFICATION_CLEAR_INFOS:
        await notificationHandler.onClearInfos(ws, userId);
        break;

      case C.REQUEST_NEW:
        await requestHandler.onNew(ws, payload, userId, teamId);
        break;

      case C.REQUEST_RESPOND:
        await requestHandler.onRespond(ws, payload, userId, teamId);
        break;

      case C.REQUEST_LEAVE:
        await requestHandler.onLeave(ws, payload, userId, teamId);
        break;

      case C.PRESENCE_PING:
        // Uygulama seviyesinde ping/pong (latency ölçümü için)
        presenceHandler.onPing(ws, payload);
        break;

      default:
        sendTo(ws, S.ERROR, { message: `Bilinmeyen mesaj türü: ${type}` });
    }
  } catch (err: any) {
    logger.wsError(`Mesaj işleme hatası (${type})`, err);
    sendTo(ws, S.ERROR, { message: err.message });
  }
};

// Server Init
// HTTP sunucusuna /ws path'inde monte edilir.
// Query params: ?token=JWT&teamId=xxx&role=Admin
const initWebSocketServer = (httpServer: any): any => {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Heartbeat zamanlayıcısını başlat
  const heartbeatTimer = setupHeartbeat(wss);

  wss.on('close', () => clearInterval(heartbeatTimer));

  wss.on('connection', (ws: any, req: any) => {
    const params = new url.URL(req.url, 'ws://localhost').searchParams;

    const auth = verifyWsAuth(params);
    if (!auth) {
      ws.close(1008, 'Geçersiz veya eksik token/teamId.');
      return;
    }

    const { userId, teamId, role } = auth;

    // Heartbeat için işaretler
    ws.isAlive  = true;
    ws._userId  = userId; // loglama için
    ws.on('pong', () => { ws.isAlive = true; }); // Native pong — bağlantı hâlâ canlı

    joinRooms(ws, userId, teamId, role);
    sendTo(ws, S.CONNECTION, { status: 'connected', userId, teamId, role });

    presenceHandler.onConnected(ws, userId, teamId);

    ws.on('message', (raw: Buffer) => handleMessage(ws, raw, userId, teamId));

    ws.on('close', () => {
      presenceHandler.onDisconnected(userId, teamId);
    });

    ws.on('error', (err: Error) => {
      logger.wsError(`WS bağlantı hatası — userId=${userId}`, err);
    });
  });

  logger.info('WebSocket sunucusu /ws yolunda hazır.', {}, 'ws');
  return wss;
};

module.exports = {
  initWebSocketServer,
  emitToUser,
  emitToTeam,
  emitToTeamAdmin,
  emitToTeamRequests,
};
export {};
