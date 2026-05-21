const { WebSocketServer } = require('ws');
const url                 = require('url');

// ─── Bağlantı Havuzları ───────────────────────────────────────────────────────
// Her userId için aktif ws bağlantısı (tek cihaz varsayımı)
const userSockets  = new Map<string, any>(); // userId → ws
// Her teamId için bağlı ws setleri
const teamSockets  = new Map<string, Set<any>>(); // teamId → Set<ws>

// ─── Yardımcı Fonksiyonlar ────────────────────────────────────────────────────
const safeStringify = (data: any): string => {
  try { return JSON.stringify(data); }
  catch { return '{}'; }
};

const sendTo = (ws: any, type: string, payload: any): void => {
  if (ws?.readyState === 1) {
    ws.send(safeStringify({ type, payload }));
  }
};

// Belirli bir kullanıcıya mesaj gönder
const emitToUser = (userId: string, type: string, payload: any): void => {
  const ws = userSockets.get(userId);
  if (ws) sendTo(ws, type, payload);
};

// Bir takımın tüm bağlı üyelerine yayın yap
const emitToTeam = (teamId: string, type: string, payload: any): void => {
  const sockets = teamSockets.get(teamId);
  if (!sockets) return;
  sockets.forEach(ws => sendTo(ws, type, payload));
};

// Bir WebSocket bağlantısını odalara kaydet
const registerConnection = (ws: any, userId: string, teamId: string): void => {
  // Eski bağlantıyı kapat (aynı kullanıcı yeniden bağlanmış olabilir)
  const existing = userSockets.get(userId);
  if (existing && existing !== ws) existing.close(1000, 'Yeni bağlantı açıldı.');

  userSockets.set(userId, ws);

  if (!teamSockets.has(teamId)) teamSockets.set(teamId, new Set());
  teamSockets.get(teamId)!.add(ws);

  // Bağlantı kapandığında temizle
  ws.once('close', () => {
    userSockets.delete(userId);
    teamSockets.get(teamId)?.delete(ws);
    if (teamSockets.get(teamId)?.size === 0) teamSockets.delete(teamId);
  });
};

// ─── WebSocket Sunucu Kurulumu ────────────────────────────────────────────────
// Mevcut HTTP server'a eklenir — frontend'in beklediği: ws://host/ws?teamId=x&userId=y
const initWebSocketServer = (httpServer: any): any => {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: any, req: any) => {
    const params = new url.URL(req.url, 'ws://localhost').searchParams;
    const userId = params.get('userId') || '';
    const teamId = params.get('teamId') || '';

    if (!userId || !teamId) {
      ws.close(1008, 'userId ve teamId zorunludur.');
      return;
    }

    registerConnection(ws, userId, teamId);
    sendTo(ws, 'connection', { status: 'connected', userId, teamId });

    ws.on('message', (raw: Buffer) => {
      try {
        const { type, payload } = JSON.parse(raw.toString());
        handleClientMessage(ws, type, payload, userId, teamId);
      } catch {
        sendTo(ws, 'error', { message: 'Geçersiz mesaj formatı.' });
      }
    });

    ws.on('error', (err: Error) => {
      console.error(`[WS] Hata — userId=${userId}:`, err.message);
    });
  });

  console.log('[WS] WebSocket sunucusu /ws yolunda hazır.');
  return wss;
};

// ─── İstemci Mesaj İşleyicisi ─────────────────────────────────────────────────
// Notification/Request servisleri dynamic require ile alınır (circular dependency önlemi)
const handleClientMessage = async (
  ws:     any,
  type:   string,
  payload: any,
  userId: string,
  teamId: string,
): Promise<void> => {
  try {
    const notificationService = require('../modules/notifications/notification.service');
    const requestService      = require('../modules/requests/request.service');

    switch (type) {

      case 'notification:delete':
        await notificationService.deleteNotification(payload.id, userId);
        sendTo(ws, 'notification:deleted', { id: payload.id });
        break;

      case 'notification:clear_infos':
        await notificationService.clearUserInfos(userId);
        sendTo(ws, 'notification:cleared', { userId });
        break;

      case 'request:new': {
        const req = await requestService.createRequest({ ...payload, senderId: userId, teamId });
        // Takımdaki tüm Admin bağlantılarına yeni talebi yayınla
        emitToTeam(teamId, 'request:update', { action: 'new', request: req });
        sendTo(ws, 'request:sent', { id: req.id });
        break;
      }

      case 'request:respond': {
        const updated = await requestService.respondToRequest(
          payload.id,
          payload.action,
          payload.teamId || teamId,
          payload.rejectionReason,
        );
        // Takıma güncellemeyi yayınla
        emitToTeam(payload.teamId || teamId, 'request:update', {
          action: 'responded',
          request: updated,
        });
        // Talebi oluşturan kullanıcıya bildirim gönder
        if (updated.senderId) {
          emitToUser(updated.senderId, 'notification:new', {
            type:    'info',
            text:    `Talebiniz "${updated.title}" ${payload.action === 'approved' ? 'onaylandı' : 'reddedildi'}.`,
            date:    new Date().toISOString(),
            teamId:  updated.teamId,
          });
        }
        break;
      }

      case 'request:leave': {
        const req = await requestService.createRequest({
          type:     'request',
          category: 'team',
          title:    'Takımdan Ayrılma İsteği',
          text:     `Kullanıcı takımdan ayrılmak istiyor.`,
          userName: userId,
          senderId: userId,
          teamId:   payload.teamId || teamId,
          path:     '/team',
          status:   'pending',
        });
        emitToTeam(payload.teamId || teamId, 'request:update', { action: 'new', request: req });
        sendTo(ws, 'request:sent', { id: req.id });
        break;
      }

      default:
        sendTo(ws, 'error', { message: `Bilinmeyen mesaj türü: ${type}` });
    }
  } catch (err: any) {
    console.error(`[WS] Mesaj işleme hatası (${type}):`, err.message);
    sendTo(ws, 'error', { message: err.message });
  }
};

module.exports = { initWebSocketServer, emitToUser, emitToTeam };
export {};
