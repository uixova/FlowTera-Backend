const prisma = require('../../config/prisma');

// Mapper'lar 
const mapRequest = (n: any) => ({
  id:               n.id,
  type:             n.type,
  teamId:           n.teamId   || '',
  category:         n.category || 'personal',
  user:             n.userName || '',
  title:            n.title    || '',
  detail:           n.text     || '',
  date:             n.date.toISOString(),
  targetId:         n.targetId || undefined,
  path:             n.path     || '/',
  status:           (n.status || 'pending') as 'pending' | 'approved' | 'rejected',
  userId:           n.senderId || undefined,
  rejectionReason:  n.rejectionReason || undefined,
});

const mapInfo = (n: any) => ({
  id:       n.id,
  type:     (n.type || 'info') as 'info' | 'invite',
  userId:   n.userId   || '',
  category: n.category || undefined,
  text:     n.text     || '',
  date:     n.date.toISOString(),
  teamId:   n.teamId   || undefined,
  sender:   n.userName || undefined,
});

// Service 
class NotificationService {
  // GET /notifications → { requests, notifications }
  // Frontend'in api.notifications.getAll() çağrısına yanıt verir
  async getNotifications(userId?: string, teamId?: string) {
    const [requestRows, infoRows] = await Promise.all([
      // type='request' olan kayıtlar → Requests sayfası (admin görür)
      prisma.notification.findMany({
        where: {
          type:   'request',
          teamId: teamId || undefined,
        },
        orderBy: { date: 'desc' },
      }),
      // type='info' veya 'invite' → kullanıcıya özel bildirimler
      prisma.notification.findMany({
        where: {
          type:   { in: ['info', 'invite'] },
          userId: userId || undefined,
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    return {
      requests:      requestRows.map(mapRequest),
      notifications: infoRows.map(mapInfo),
    };
  }

  // Bildirim sil (kullanıcıya ait olanlar)
  async deleteNotification(id: string, userId: string) {
    const record = await prisma.notification.findUnique({ where: { id } });
    if (!record) throw new Error('Bildirim bulunamadı.');
    // Güvenlik: sadece alıcı veya gönderici silebilir
    if (record.userId !== userId && record.senderId !== userId) {
      throw new Error('Bu bildirimi silme yetkiniz yok.');
    }
    await prisma.notification.delete({ where: { id } });
  }

  // Kullanıcının tüm 'info' bildirimlerini temizle
  async clearUserInfos(userId: string) {
    await prisma.notification.deleteMany({
      where: { userId, type: 'info' },
    });
  }

  // Yeni info/invite bildirimi oluştur (sistem içi çağrılar için)
  async createInfoNotification(data: {
    userId:    string;
    type:      'info' | 'invite';
    category?: string;
    text:      string;
    teamId?:   string;
    senderId?: string;
    userName?: string;
    path?:     string;
  }) {
    return prisma.notification.create({
      data: {
        type:     data.type,
        category: data.category || null,
        text:     data.text,
        userName: data.userName  || null,
        path:     data.path      || null,
        userId:   data.userId,
        teamId:   data.teamId    || null,
        senderId: data.senderId  || null,
      },
    });
  }
}

module.exports = new NotificationService();
export {};
