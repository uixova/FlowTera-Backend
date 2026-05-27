const prisma = require('../../config/prisma');
const { DEFAULT_PAGE_SIZE } = require('../../config/constants');
const { keyToUrl, getPresignedDownloadUrl } = require('../../utils/s3');

// AWS_S3_PUBLIC=true ise statik URL (public bucket), aksi halde presigned URL (2 saat)
const S3_PUBLIC          = process.env.AWS_S3_PUBLIC === 'true';
const S3_DOWNLOAD_EXPIRES = parseInt(process.env.S3_DOWNLOAD_EXPIRES || '7200', 10);

const resolveUrl = async (key: string | null): Promise<string | null> => {
  if (!key) return null;
  if (S3_PUBLIC) return keyToUrl(key);
  try { return await getPresignedDownloadUrl(key, S3_DOWNLOAD_EXPIRES); }
  catch { return keyToUrl(key); } // S3 yoksa fallback
};

const createdBySelect = {
  select: { name: true, avatar: true, isDeleted: true, subscription: true },
};

const enrichExpense = async (expense: any) => {
  const creator   = expense.createdBy;
  const isDeleted = creator?.isDeleted || false;
  const sub       = creator?.subscription as any;
  return {
    ...expense,
    receiptUrl: await resolveUrl(expense.receipt),
    reportUrl:  await resolveUrl(expense.report),
    isDeleted:  !!expense.deletedAt,          // frontend'e silinmiş bilgisi
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
    isDeleted:  !!trip.deletedAt,
    createdBy:  { id: trip.createdById, name: isDeleted ? 'DeletedUser' : (creator?.name || 'Unknown Traveller') },
    userName:   isDeleted ? 'DeletedUser' : (creator?.name || 'Unknown Traveller'),
    userAvatar: isDeleted ? null : (creator?.avatar || null),
    userPlan:   isDeleted ? 'free' : (sub?.plan || 'free'),
  };
};

class ArchiveService {
  // Takıma ait harcama ve seyahat kayıtlarını birlikte döner (arşiv görünümü).
  // Soft-deleted (silinmiş) kayıtlar da dahil edilir — S3 görselleri korunmuştur.
  async getArchiveData(teamId: string, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    const skip = (page - 1) * pageSize;

    // deletedAt filtresi YOK — hem aktif hem silinmiş kayıtlar arşivde görünür
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

    // enrichExpense async olduğundan Promise.all ile paralel çalıştır
    const enrichedExpenses = await Promise.all(expenses.map(enrichExpense));

    return {
      expenses: {
        data:       enrichedExpenses,
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
