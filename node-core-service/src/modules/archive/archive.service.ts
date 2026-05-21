const prisma = require('../../config/prisma');
const { DEFAULT_PAGE_SIZE } = require('../../config/constants');

const createdBySelect = {
  select: { name: true, avatar: true, isDeleted: true, subscription: true },
};

const enrichExpense = (expense: any) => {
  const creator   = expense.createdBy;
  const isDeleted = creator?.isDeleted || false;
  const sub       = creator?.subscription as any;
  return {
    ...expense,
    createdBy:  { id: expense.createdById, name: isDeleted ? 'DeletedUser' : (creator?.name || 'Unknown') },
    user:       isDeleted ? 'DeletedUser' : (creator?.name || 'Unknown'),
    userAvatar: isDeleted ? null : (creator?.avatar || null),
    userRole:   isDeleted ? 'free' : (sub?.plan || 'free'),
  };
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

class ArchiveService {
  // Takıma ait harcama ve seyahat kayıtlarını birlikte döner (arşiv görünümü).
  // Frontend'in getArchiveData() çağrısı bu uç noktayı kullanır.
  async getArchiveData(teamId: string, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    const skip = (page - 1) * pageSize;

    const [expenses, expenseCount, trips, tripCount] = await Promise.all([
      prisma.expense.findMany({
        where:   { teamId },
        skip,
        take:    pageSize,
        orderBy: { date: 'desc' },
        include: { createdBy: createdBySelect },
      }),
      prisma.expense.count({ where: { teamId } }),

      prisma.trip.findMany({
        where:   { teamId },
        skip,
        take:    pageSize,
        orderBy: { startDate: 'desc' },
        include: { createdBy: createdBySelect },
      }),
      prisma.trip.count({ where: { teamId } }),
    ]);

    return {
      expenses: {
        data:       expenses.map(enrichExpense),
        totalCount: expenseCount,
        totalPages: Math.ceil(expenseCount / pageSize),
        hasMore:    expenseCount > skip + pageSize,
        page,
        pageSize,
      },
      trips: {
        data:       trips.map(enrichTrip),
        totalCount: tripCount,
        totalPages: Math.ceil(tripCount / pageSize),
        hasMore:    tripCount > skip + pageSize,
        page,
        pageSize,
      },
    };
  }
}

module.exports = new ArchiveService();
export {};
