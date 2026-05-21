const prisma = require('../../config/prisma');
const { DEFAULT_PAGE_SIZE } = require('../../config/constants');

// createdBy üzerinden kullanıcı verisini zenginleştir
const enrichExpense = (expense: any) => {
  const creator  = expense.createdBy;
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

const createdBySelect = {
  select: { name: true, avatar: true, isDeleted: true, subscription: true },
};

class ExpenseService {
  async getAllExpenses(teamId: string, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
    const skip = (page - 1) * pageSize;

    const [expenses, totalCount] = await Promise.all([
      prisma.expense.findMany({
        where:   { teamId },
        skip,
        take:    pageSize,
        orderBy: { date: 'desc' },
        include: { createdBy: createdBySelect },
      }),
      prisma.expense.count({ where: { teamId } }),
    ]);

    return {
      data:       expenses.map(enrichExpense),
      hasMore:    totalCount > skip + pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }

  async getExpenseById(id: string) {
    const expense = await prisma.expense.findUnique({
      where:   { id },
      include: { createdBy: createdBySelect },
    });
    if (!expense) return null;
    return enrichExpense(expense);
  }

  async createExpense(input: any, createdById: string) {
    // Takım ayarlarından otomatik onay kontrolü
    const team = await prisma.team.findUnique({ where: { id: input.teamId } });
    const settings   = (team?.settings as any) || {};
    const autoApprove = settings.autoApproved && input.amount <= (settings.autoApprovedLimit || 0);

    const expense = await prisma.expense.create({
      data: {
        title:          input.title,
        category:       input.category,
        merchant:       input.merchant,
        date:           new Date(input.date),
        amount:         Number(input.amount),
        currency:       input.currency,
        currencySymbol: input.currencySymbol,
        localAmount:    input.localAmount    ? Number(input.localAmount) : null,
        localCurrency:  input.localCurrency  || null,
        localSymbol:    input.localSymbol    || null,
        exchangeRates:  input.exchangeRates  || null,
        paymentMethod:  input.paymentMethod  || null,
        desc:           input.desc           || null,
        icon:           input.icon           || null,
        status:         autoApprove ? 'approved' : 'pending',
        createdById,
        teamId:         input.teamId,
      },
      include: { createdBy: createdBySelect },
    });

    return enrichExpense(expense);
  }

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
    return enrichExpense(expense);
  }

  async updateStatus(id: string, status: 'pending' | 'approved' | 'rejected', rejectionReason?: string) {
    const expense = await prisma.expense.update({
      where:   { id },
      data:    { status, rejectionReason: rejectionReason || null },
      include: { createdBy: createdBySelect },
    });
    return enrichExpense(expense);
  }

  async deleteExpense(id: string) {
    await prisma.expense.delete({ where: { id } });
    return { message: 'Harcama başarıyla silindi.' };
  }
}

module.exports = new ExpenseService();
export {};
