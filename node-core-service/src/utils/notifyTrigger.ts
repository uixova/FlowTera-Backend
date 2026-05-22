const prisma  = require('../config/prisma');
const logger  = require('./logger');

// WS emit fonksiyonları — circular dependency önlemek için runtime'da require edilir
const getWs = () => {
  try { return require('../web_sockets/socket.server'); }
  catch { return null; }
};

// Bildirim Oluştur + WS Yayını 
// Tüm otomatik bildirimler buradan geçer.
// DB'ye yazar VE bağlantısı olan kullanıcıya anlık WS mesajı gönderir.

interface NotifyInput {
  userId:    string;       // Bildirimi alacak kullanıcı
  type:      'info' | 'invite';
  category?: string;       // success | warning | danger | info
  text:      string;
  teamId?:   string;
  teamName?: string;       // invite tipinde gösterilir
  senderId?: string;
  userName?: string;       // Gönderenin adı
  path?:     string;
}

const sendNotification = async (input: NotifyInput): Promise<void> => {
  try {
    const record = await prisma.notification.create({
      data: {
        type:     input.type,
        category: input.category || null,
        text:     input.text,
        userId:   input.userId,
        teamId:   input.teamId   || null,
        senderId: input.senderId || null,
        userName: input.userName || null,
        path:     input.path     || null,
      },
    });

    // WS üzerinden anlık bildirim (bağlı ise)
    const ws = getWs();
    if (ws?.emitToUser) {
      ws.emitToUser(input.userId, 'notification:new', {
        id:       record.id,
        type:     input.type,
        category: input.category,
        text:     input.text,
        date:     record.date.toISOString(),
        teamId:   input.teamId   || undefined,
        teamName: input.teamName || undefined,
        sender:   input.userName || undefined,
      });
    }
  } catch (err) {
    logger.error('Bildirim oluşturma hatası', err, 'notify');
  }
};

// Hızlı Fabrika Fonksiyonlar 

// Harcama onayı → yaratıcıya bildirim
const notifyExpenseApproved = (creatorId: string, teamId: string, title: string): void => {
  sendNotification({
    userId:   creatorId,
    type:     'info',
    category: 'success',
    text:     `"${title}" harcamanız onaylandı.`,
    teamId,
    path:     '/expense',
  });
};

// Harcama reddi → yaratıcıya bildirim
const notifyExpenseRejected = (creatorId: string, teamId: string, title: string, reason?: string): void => {
  sendNotification({
    userId:   creatorId,
    type:     'info',
    category: 'danger',
    text:     reason
      ? `"${title}" harcamanız reddedildi. Gerekçe: ${reason}`
      : `"${title}" harcamanız reddedildi.`,
    teamId,
    path:     '/expense',
  });
};

// Seyahat onayı → yaratıcıya bildirim
const notifyTripApproved = (creatorId: string, teamId: string, title: string): void => {
  sendNotification({
    userId:   creatorId,
    type:     'info',
    category: 'success',
    text:     `"${title}" seyahat talebiniz onaylandı.`,
    teamId,
    path:     '/trip',
  });
};

// Seyahat reddi → yaratıcıya bildirim
const notifyTripRejected = (creatorId: string, teamId: string, title: string, reason?: string): void => {
  sendNotification({
    userId:   creatorId,
    type:     'info',
    category: 'danger',
    text:     reason
      ? `"${title}" seyahat talebiniz reddedildi. Gerekçe: ${reason}`
      : `"${title}" seyahat talebiniz reddedildi.`,
    teamId,
    path:     '/trip',
  });
};

// Takım daveti → davet edilen kullanıcıya invite bildirimi
const notifyTeamInvite = async (
  invitedUserId: string,
  teamId:        string,
  inviterName:   string,
  senderId:      string,
): Promise<void> => {
  // Takım adını DB'den çek
  let teamName = '';
  try {
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { name: true } });
    teamName   = team?.name || '';
  } catch { /* isim olmasa da devam et */ }

  sendNotification({
    userId:   invitedUserId,
    type:     'invite',
    category: 'info',
    text:     `${inviterName} sizi ekibine davet etti.`,
    teamId,
    teamName,
    senderId,
    userName: inviterName,
    path:     '/team',
  });
};

// Talep yanıtı → talep sahibine bildirim
const notifyRequestResponded = (
  requesterId: string,
  teamId:      string,
  title:       string,
  action:      'approved' | 'rejected',
  reason?:     string,
): void => {
  const verb = action === 'approved' ? 'onaylandı' : 'reddedildi';
  sendNotification({
    userId:   requesterId,
    type:     'info',
    category: action === 'approved' ? 'success' : 'danger',
    text:     reason
      ? `"${title}" talebiniz ${verb}. Gerekçe: ${reason}`
      : `"${title}" talebiniz ${verb}.`,
    teamId,
    path:     '/team',
  });
};

// Yeni üye takıma katıldığında takım geneli bildirim (admin dışı üyelere)
const notifyMemberJoined = (teamId: string, newMemberName: string): void => {
  // WS üzerinden takım odasına yayın yap
  const ws = getWs();
  if (ws?.emitToTeam) {
    ws.emitToTeam(teamId, 'notification:new', {
      type:     'info',
      category: 'success',
      text:     `Yeni üye ${newMemberName} gruba katıldı.`,
      date:     new Date().toISOString(),
      teamId,
    });
  }
};

module.exports = {
  sendNotification,
  notifyExpenseApproved,
  notifyExpenseRejected,
  notifyTripApproved,
  notifyTripRejected,
  notifyTeamInvite,
  notifyRequestResponded,
  notifyMemberJoined,
};
export {};
