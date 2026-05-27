const prisma   = require('../../config/prisma');
const { DEFAULT_PAGE_SIZE } = require('../../config/constants');
const logs     = require('../../utils/logWriter');
const notify   = require('../../utils/notifyTrigger');
const { keyToUrl, getPresignedDownloadUrl } = require('../../utils/s3');

// AWS_S3_PUBLIC=true → statik URL (public bucket), aksi halde presigned URL (2 saat)
const S3_PUBLIC          = process.env.AWS_S3_PUBLIC === 'true';
const S3_DOWNLOAD_EXPIRES = parseInt(process.env.S3_DOWNLOAD_EXPIRES || '7200', 10);
const resolveUrl = async (key: string | null): Promise<string | null> => {
  if (!key) return null;
  if (S3_PUBLIC) return keyToUrl(key);
  try { return await getPresignedDownloadUrl(key, S3_DOWNLOAD_EXPIRES); }
  catch { return keyToUrl(key); }
};

const PYTHON_ML_URL    = process.env.PYTHON_ML_URL    || 'http://localhost:8000';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

// Harcama raporu PDF üretip S3'e yükler, report key döner
async function _generateAndUploadReport(expense: any, teamName: string): Promise<string | null> {
  try {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const BUCKET = process.env.AWS_S3_BUCKET  || '';
    const REGION = process.env.AWS_S3_REGION  || 'eu-central-1';
    if (!BUCKET) return null;

    const res = await fetch(`${PYTHON_ML_URL}/ml/reports/expense`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-API-Key': INTERNAL_API_KEY },
      body:    JSON.stringify({ ...expense, team_name: teamName }),
    });
    if (!res.ok) return null;

    const pdfBytes = await res.arrayBuffer();
    const key      = `teams/${expense.teamId}/reports/${expense.id}.pdf`;

    const s3 = new S3Client({ region: REGION });
    await s3.send(new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      Body:        Buffer.from(pdfBytes),
      ContentType: 'application/pdf',
    }));
    return key;
  } catch {
    return null;
  }
}

// Veri Zenginleştirici
const createdBySelect = {
  select: { name: true, avatar: true, isDeleted: true, subscription: true },
};

const enrichExpense = async (expense: any) => {
  const creator   = expense.createdBy;
  const isDeleted = creator?.isDeleted || false;
  const sub       = creator?.subscription as any;

  // receipt ve report S3 key tutar; presigned veya statik URL hesaplanır
  const [rUrl, pUrl] = await Promise.all([
    resolveUrl(expense.receipt),
    resolveUrl(expense.report),
  ]);

  return {
    ...expense,
    receiptUrl: rUrl,
    reportUrl:  pUrl,
    createdBy:  { id: expense.createdById, name: isDeleted ? 'DeletedUser' : (creator?.name || 'Unknown') },
    user:       isDeleted ? 'DeletedUser' : (creator?.name || 'Unknown'),
    userAvatar: isDeleted ? null : (creator?.avatar || null),
    userRole:   isDeleted ? 'free' : (sub?.plan || 'free'),
  };
};

class ExpenseService {
  // Takıma ait harcamaları sayfalı getir
  async getAllExpenses(teamId: string, page = 1, pageSize = DEFAULT_PAGE_SIZE, startDate?: string, endDate?: string) {
    const skip = (page - 1) * pageSize;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate)   dateFilter.lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    const where: any = { teamId, deletedAt: null, ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}) };

    const [expenses, totalCount] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take:    pageSize,
        orderBy: { date: 'desc' },
        include: { createdBy: createdBySelect },
      }),
      prisma.expense.count({ where }),
    ]);

    const enriched = await Promise.all(expenses.map(enrichExpense));
    return {
      data:       enriched,
      total:      totalCount,
      page,
      pageSize,
      hasMore:    totalCount > skip + pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }

  // Tekil harcama getir — userId ile takım üyeliği doğrulanır
  async getExpenseById(id: string, userId: string) {
    const expense = await prisma.expense.findFirst({
      where:   { id, deletedAt: null },
      include: { createdBy: createdBySelect },
    });
    if (!expense) return null;

    const member = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId: expense.teamId } },
    });
    if (!member) return null;

    return await enrichExpense(expense);
  }

  // Yeni harcama oluştur
  async createExpense(input: any, createdById: string, role: string = 'Member') {
    // Takım ayarlarından otomatik onay kontrolü
    const team     = await prisma.team.findUnique({ where: { id: input.teamId } });
    const settings = (team?.settings as any) || {};
    const autoApprove = settings.autoApproved && input.amount <= (settings.autoApprovedLimit || 0);

    const expense = await prisma.expense.create({
      data: {
        title:          input.title,
        category:       input.category,
        merchant:       input.merchant,
        date:           input.date ? new Date(input.date) : new Date(),
        amount:         Number(input.amount),
        currency:       input.currency,
        currencySymbol: input.currencySymbol || '',
        localAmount:    input.localAmount    ? Number(input.localAmount) : null,
        localCurrency:  input.localCurrency  || null,
        localSymbol:    input.localSymbol    || null,
        exchangeRates:  input.exchangeRates  || null,
        paymentMethod:  input.paymentMethod  || null,
        desc:           input.desc           || null,
        icon:           input.icon           || null,
        image:          input.image          || null,
        receipt:        input.receipt        || null,
        isReported:     Boolean(input.isReported),
        status:         autoApprove ? 'approved' : 'pending',
        createdById,
        teamId:         input.teamId,
      },
      include: { createdBy: createdBySelect },
    });

    const enriched  = await enrichExpense(expense);
    const amountStr = `${input.currency} ${Number(input.amount).toLocaleString()}`;
    logs.logExpenseCreated(input.teamId, enriched.user, role, input.title, amountStr);

    // Onay bekleyen giderler için admin'e request bildirimi oluştur + WS
    if (!autoApprove) {
      notify.notifyExpenseRequest(
        expense.id, expense.title, expense.amount,
        expense.currency, expense.teamId, expense.createdById, enriched.user,
      ).catch(() => {});
    }

    // isReported=true → arka planda PDF rapor üret ve S3'e yükle
    if (input.isReported) {
      _generateAndUploadReport(
        { ...expense, user: enriched.user },
        team?.name || 'FlowTera',
      ).then((reportKey: string | null) => {
        if (reportKey) {
          prisma.expense.update({
            where: { id: expense.id },
            data:  { report: reportKey },
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    return enriched;
  }

  // Harcama güncelle — değişiklik WS üzerinden takıma bildirilir
  async updateExpense(id: string, data: any) {
    const allowed = [
      'title', 'category', 'merchant', 'date', 'amount', 'currency', 'currencySymbol',
      'localAmount', 'localCurrency', 'localSymbol', 'exchangeRates',
      'paymentMethod', 'desc', 'icon', 'report', 'image', 'receipt',
    ];
    const updateData: any = {};
    for (const key of allowed) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }
    if (updateData.date)        updateData.date        = new Date(updateData.date);
    if (updateData.amount)      updateData.amount      = Number(updateData.amount);
    if (updateData.localAmount) updateData.localAmount = Number(updateData.localAmount);

    const expense = await prisma.expense.update({
      where:   { id },
      data:    updateData,
      include: { createdBy: createdBySelect },
    });
    const enriched = await enrichExpense(expense);

    // WS: takım admin'ine expense güncellendi bildirimi gönder
    try {
      const ws = require('../../web_sockets/socket.server');
      if (ws?.emitToTeamAdmin) {
        ws.emitToTeamAdmin(expense.teamId, 'request:update', {
          action:  'expense_updated',
          request: {
            id: expense.id, type: 'expense_update', category: 'expense',
            title: expense.title, teamId: expense.teamId, targetId: expense.id,
            status: expense.status, detail: `Harcama güncellendi: ${expense.title}`,
            date: new Date().toISOString(),
          },
        });
      }
    } catch { /* WS yoksa sessizce devam */ }

    return enriched;
  }

  // Harcama durumunu güncelle (admin aksiyonu)
  async updateStatus(
    id:               string,
    status:           'pending' | 'approved' | 'rejected',
    adminName:        string,
    rejectionReason?: string,
    teamId?:          string,
  ) {
    // Cross-check WHERE'e gömülü — tek atomik sorgu, TOCTOU yok
    let expense: any;
    try {
      expense = await prisma.expense.update({
        where:   { id, ...(teamId ? { teamId } : {}) },
        data:    { status, rejectionReason: rejectionReason || null },
        include: { createdBy: createdBySelect },
      });
    } catch (err: any) {
      if (err?.code === 'P2025') throw new Error('Harcama bulunamadı veya erişim yetkiniz yok.');
      throw err;
    }

    const enriched  = await enrichExpense(expense);
    const amountStr = `${expense.currency} ${Number(expense.amount).toLocaleString()}`;

    // TeamLog + Bildirim — onay veya red
    if (status === 'approved') {
      logs.logExpenseApproved(expense.teamId, adminName, expense.title, amountStr);
      notify.notifyExpenseApproved(expense.createdById, expense.teamId, expense.title);
    } else if (status === 'rejected') {
      logs.logExpenseRejected(expense.teamId, adminName, expense.title, rejectionReason);
      notify.notifyExpenseRejected(expense.createdById, expense.teamId, expense.title, rejectionReason);
    }

    return enriched;
  }

  // Harcama sil (soft delete — DB kaydı ve S3 görseli korunur)
  async deleteExpense(id: string) {
    const expense = await prisma.expense.findFirst({ where: { id, deletedAt: null } });
    if (!expense) throw new Error('Harcama bulunamadı.');

    await prisma.expense.update({
      where: { id },
      data:  { deletedAt: new Date() },
    });
    // S3'teki receipt kasıtlı olarak SİLİNMİYOR — arşivde görünmeye devam eder
    return { message: 'Harcama başarıyla silindi.' };
  }
}

module.exports = new ExpenseService();
export {};
