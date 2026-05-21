const prisma = require('../../config/prisma');
const { DEFAULT_PAGE_SIZE } = require('../../config/constants');

const createdBySelect = {
  select: { name: true, avatar: true, isDeleted: true, subscription: true },
};

const enrichTrip = (trip: any) => {
  const creator  = trip.createdBy;
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
  async getTripsByTeam(teamId: string, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    const skip = (page - 1) * pageSize;

    const [trips, totalCount] = await Promise.all([
      prisma.trip.findMany({
        where:   { teamId },
        skip,
        take:    pageSize,
        orderBy: { startDate: 'asc' },
        include: { createdBy: createdBySelect },
      }),
      prisma.trip.count({ where: { teamId } }),
    ]);

    return {
      data:       trips.map(enrichTrip),
      hasMore:    totalCount > skip + pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }

  async getTripById(tripId: string) {
    const trip = await prisma.trip.findUnique({
      where:   { id: tripId },
      include: { createdBy: createdBySelect },
    });
    if (!trip) return null;
    return enrichTrip(trip);
  }

  async createTrip(input: any, createdById: string) {
    const trip = await prisma.trip.create({
      data: {
        title:          input.title,
        category:       input.category,
        destination:    input.destination,
        vehicle:        input.vehicle,
        date:           new Date(input.date),
        startDate:      input.startDate ? new Date(input.startDate) : null,
        endDate:        input.endDate   ? new Date(input.endDate)   : null,
        duration:       input.duration  || null,
        amount:         Number(input.amount),
        currency:       input.currency,
        currencySymbol: input.currencySymbol,
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
    return enrichTrip(trip);
  }

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
    return enrichTrip(trip);
  }

  // Durum geçişi: pending → onroad → completed
  async updateTripStatus(id: string, status: string, rejectionReason?: string) {
    const trip = await prisma.trip.update({
      where:   { id },
      data:    { status, rejectionReason: rejectionReason || null },
      include: { createdBy: createdBySelect },
    });
    return enrichTrip(trip);
  }

  async deleteTrip(id: string) {
    await prisma.trip.delete({ where: { id } });
    return { message: 'Seyahat başarıyla silindi.' };
  }
}

module.exports = new TripService();
export {};
