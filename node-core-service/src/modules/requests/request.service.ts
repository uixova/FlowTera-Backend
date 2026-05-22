const prisma  = require('../../config/prisma');
const logs    = require('../../utils/logWriter');
const notify  = require('../../utils/notifyTrigger');

// Prisma Notification → Frontend NotificationRequest Dönüştürücü 
const mapRequest = (n: any) => ({
  id:              n.id,
  type:            n.type,
  teamId:          n.teamId   || '',
  category:        n.category || 'personal',
  user:            n.userName || '',
  title:           n.title    || '',
  detail:          n.text     || '',
  date:            n.date instanceof Date ? n.date.toISOString() : n.date,
  targetId:        n.targetId       || undefined,
  path:            n.path           || '/',
  status:          (n.status        || 'pending') as 'pending' | 'approved' | 'rejected',
  userId:          n.senderId       || undefined,
  rejectionReason: n.rejectionReason || undefined,
});

class RequestService {
  // Takıma ait tüm talepleri getir (admin Requests sayfası için)
  async getTeamRequests(teamId: string, status?: string) {
    const where: any = { type: 'request', teamId };
    if (status) where.status = status;

    const rows = await prisma.notification.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    return rows.map(mapRequest);
  }

  // Tekil talebi getir
  async getRequestById(id: string) {
    const row = await prisma.notification.findUnique({
      where: { id },
    });
    if (!row || row.type !== 'request') return null;
    return mapRequest(row);
  }

  // Yeni talep oluştur — WS mesajları ve REST endpoint her ikisi de buraya gelir
  async createRequest(data: {
    type?:     string;
    category:  string;
    title:     string;
    text:      string;
    userName?: string;
    senderId?: string;
    teamId:    string;
    targetId?: string;
    path?:     string;
    status?:   string;
  }) {
    // senderId varsa kullanıcının adını getir (yoksa payload'daki userName kullanılır)
    let displayName = data.userName || '';
    if (!displayName && data.senderId) {
      const user = await prisma.user.findUnique({
        where:  { id: data.senderId },
        select: { name: true },
      }).catch(() => null);
      displayName = user?.name || '';
    }

    const row = await prisma.notification.create({
      data: {
        type:     data.type     || 'request',
        category: data.category,
        title:    data.title,
        text:     data.text,
        userName: displayName,
        path:     data.path     || `/${data.category}`,
        status:   data.status   || 'pending',
        teamId:   data.teamId,
        senderId: data.senderId || null,
        targetId: data.targetId || null,
      },
    });

    // TeamLog — talep oluşturuldu
    logs.writeTeamLog({
      teamId:   data.teamId,
      type:     'request_create',
      userName: displayName || 'Kullanıcı',
      role:     'Member',
      badge:    'Member',
      action:   'yeni talep oluşturdu:',
      target:   data.title,
      details:  { category: data.category },
    });

    return mapRequest(row);
  }

  // Talebi onayla veya reddet (Admin aksiyonu)
  async respondToRequest(
    id:               string,
    action:           'approved' | 'rejected',
    teamId:           string,
    rejectionReason?: string,
    adminName         = 'Admin',
  ) {
    const row = await prisma.notification.findUnique({ where: { id } });
    if (!row)                     throw new Error('Talep bulunamadı.');
    if (row.type !== 'request')   throw new Error('Bu kayıt bir talep değil.');
    if (row.teamId !== teamId)    throw new Error('Bu talep bu takıma ait değil.');
    if (row.status !== 'pending') throw new Error('Yalnızca beklemedeki talepler işlenebilir.');

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        status:          action,
        rejectionReason: action === 'rejected' ? (rejectionReason || null) : null,
      },
    });

    // TeamLog — talep yanıtlandı
    if (action === 'approved') {
      logs.logRequestApproved(teamId, adminName, row.title || '');
    } else {
      logs.logRequestRejected(teamId, adminName, row.title || '', rejectionReason);
    }

    // Talep sahibine bildirim gönder
    if (row.senderId) {
      notify.notifyRequestResponded(row.senderId, teamId, row.title || 'Talep', action, rejectionReason);
    }

    return mapRequest(updated);
  }

  // Talebi iptal et (talep sahibi kendi talebini geri çekebilir)
  async cancelRequest(id: string, userId: string) {
    const row = await prisma.notification.findUnique({ where: { id } });
    if (!row)                     throw new Error('Talep bulunamadı.');
    if (row.senderId !== userId)  throw new Error('Bu talebi iptal etme yetkiniz yok.');
    if (row.status !== 'pending') throw new Error('Yalnızca beklemedeki talepler iptal edilebilir.');

    await prisma.notification.delete({ where: { id } });
    return { message: 'Talep iptal edildi.' };
  }
}

module.exports = new RequestService();
export {};
