const prisma   = require('../../config/prisma');
const { DEFAULT_PAGE_SIZE } = require('../../config/constants');
const logs     = require('../../utils/logWriter');
const notify   = require('../../utils/notifyTrigger');

// Veri Zenginleştirici
const createdBySelect = {
  select: { name: true, avatar: true, isDeleted: true, subscription: true },
};

const enrichTrip = (trip: any) => {
  const creator   = trip.createdBy;
  const isDeleted = creator?.isDeleted || false;
  const sub       = creator?.subscription as any;

  return {
    ...trip,
    createdBy:  { id: trip.createdById, name: isDeleted ? 'DeletedUser' : (creator?.name || 'Unknown Traveller') },
    userName:   isDeleted ? 'DeletedUser' : (creator?.name || 'Unknown Traveller'),
    userAvatar: isDeleted ? null : (creator?.avatar || null),
    userPlan:   isDeleted ? 'free' : (sub?.plan || 'free'),
  };
};

class TripService {
  // Takıma ait seyahatleri sayfalı getir
  async getTripsByTeam(teamId: string, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    const skip = (page - 1) * pageSize;

    const [trips, totalCount] = await Promise.all([
      prisma.trip.findMany({
        where:   { teamId, deletedAt: null },
        skip,
        take:    pageSize,
        orderBy: { startDate: 'asc' },
        include: { createdBy: createdBySelect },
      }),
      prisma.trip.count({ where: { teamId, deletedAt: null } }),
    ]);

    return {
      data:       trips.map(enrichTrip),
      total:      totalCount,
      page,
      pageSize,
      hasMore:    totalCount > skip + pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }

  // Tekil seyahat getir — userId ile takım üyeliği doğrulanır
  async getTripById(tripId: string, userId: string) {
    const trip = await prisma.trip.findFirst({
      where:   { id: tripId, deletedAt: null },
      include: { createdBy: createdBySelect },
    });
    if (!trip) return null;

    const member = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId: trip.teamId } },
    });
    if (!member) return null;

    return enrichTrip(trip);
  }

  // Yeni seyahat oluştur
  async createTrip(input: any, createdById: string, role: string = 'Member') {
    const trip = await prisma.trip.create({
      data: {
        title:          input.title,
        category:       input.category,
        destination:    input.destination,
        vehicle:        input.vehicle,
        date:           input.date ? new Date(input.date) : new Date(),
        startDate:      input.startDate ? new Date(input.startDate) : null,
        endDate:        input.endDate   ? new Date(input.endDate)   : null,
        duration:       input.duration  || null,
        amount:         Number(input.amount),
        currency:       input.currency,
        currencySymbol: input.currencySymbol || '',
        localAmount:    input.localAmount ? Number(input.localAmount) : null,
        localCurrency:  input.localCurrency || null,
        localSymbol:    input.localSymbol   || null,
        exchangeRates:  input.exchangeRates || null,
        desc:           input.desc          || null,
        icon:           input.icon          || null,
        report:         input.report        || null,
        status:         'pending',
        createdById,
        teamId:         input.teamId,
      },
      include: { createdBy: createdBySelect },
    });

    const enriched   = enrichTrip(trip);
    const amountStr  = `${input.currency} ${Number(input.amount).toLocaleString()}`;

    // TeamLog — seyahat eklendi
    logs.logTripCreated(input.teamId, enriched.userName, role, input.title, input.destination, amountStr);

    // Admin'e request bildirimi oluştur + WS
    notify.notifyTripRequest(
      trip.id, trip.title, input.destination || trip.destination,
      trip.amount, trip.currency, trip.teamId, trip.createdById, enriched.userName,
    ).catch(() => {});

    return enriched;
  }

  // Seyahat güncelle
  async updateTrip(id: string, data: any) {
    const allowed = [
      'title', 'category', 'destination', 'vehicle', 'date', 'startDate', 'endDate',
      'duration', 'amount', 'currency', 'currencySymbol',
      'localAmount', 'localCurrency', 'localSymbol', 'exchangeRates',
      'desc', 'icon', 'report', 'statusClass',
    ];
    const updateData: any = {};
    for (const key of allowed) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }
    if (updateData.date)      updateData.date      = new Date(updateData.date);
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate)   updateData.endDate   = new Date(updateData.endDate);
    if (updateData.amount)    updateData.amount    = Number(updateData.amount);

    const trip = await prisma.trip.update({
      where:   { id },
      data:    updateData,
      include: { createdBy: createdBySelect },
    });
    const enriched = enrichTrip(trip);

    // WS: takım admin'ine seyahat güncellendi bildirimi gönder
    try {
      const ws = require('../../web_sockets/socket.server');
      if (ws?.emitToTeamAdmin) {
        ws.emitToTeamAdmin(trip.teamId, 'request:update', {
          action:  'trip_updated',
          request: {
            id: trip.id, type: 'trip_update', category: 'travel',
            title: trip.title, teamId: trip.teamId, targetId: trip.id,
            status: trip.status, detail: `Seyahat güncellendi: ${trip.title}`,
            date: new Date().toISOString(),
          },
        });
      }
    } catch { /* WS yoksa sessizce devam */ }

    return enriched;
  }

  // Durum geçişi: pending → onroad → completed (admin aksiyonu)
  async updateTripStatus(
    id:               string,
    status:           string,
    adminName:        string,
    rejectionReason?: string,
    teamId?:          string,
  ) {
    // Cross-check WHERE'e gömülü — tek atomik sorgu, TOCTOU yok
    let trip: any;
    try {
      trip = await prisma.trip.update({
        where:   { id, ...(teamId ? { teamId } : {}) },
        data:    { status, rejectionReason: rejectionReason || null },
        include: { createdBy: createdBySelect },
      });
    } catch (err: any) {
      if (err?.code === 'P2025') throw new Error('Seyahat kaydı bulunamadı veya erişim yetkiniz yok.');
      throw err;
    }

    const enriched  = enrichTrip(trip);
    const amountStr = `${trip.currency} ${Number(trip.amount).toLocaleString()}`;

    // TeamLog + Bildirim — durum geçişine göre farklı log tipi
    if (status === 'approved') {
      logs.logTripApproved(trip.teamId, adminName, trip.title, trip.destination, amountStr);
      notify.notifyTripApproved(trip.createdById, trip.teamId, trip.title);
    } else if (status === 'rejected') {
      // "rejection" log tipi kullanılır (harcama red ile aynı tip)
      logs.logExpenseRejected(trip.teamId, adminName, trip.title, rejectionReason);
      notify.notifyTripRejected(trip.createdById, trip.teamId, trip.title, rejectionReason);
    } else if (status === 'onroad' || status === 'completed') {
      logs.logTripStatusUpdate(trip.teamId, enriched.userName, trip.title, status, trip.destination);
    }

    return enriched;
  }

  // Seyahat sil (soft delete — S3 görseli ve DB kaydı korunur)
  async deleteTrip(id: string) {
    const trip = await prisma.trip.findFirst({ where: { id, deletedAt: null } });
    if (!trip) throw new Error('Seyahat bulunamadı.');

    await prisma.trip.update({
      where: { id },
      data:  { deletedAt: new Date() },
    });
    return { message: 'Seyahat başarıyla silindi.' };
  }
}

module.exports = new TripService();
export {};
