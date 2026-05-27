const { z } = require('zod');

// Bu listeler frontend CreateExpense.jsx ile birebir eşleşmelidir.
// Her yeni kategori/ödeme yöntemi her iki yerde birden güncellenmelidir.
const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Accommodation', 'Health', 'Entertainment',
  'Office', 'Education', 'Technology', 'Shopping', 'Utilities',
  'Finance', 'Events', 'Marketing', 'Legal', 'Other',
] as const;

const PAYMENT_METHODS = [
  'Cash', 'Credit Card', 'Bank Transfer', 'Debit Card',
  'Mobile Payment', 'Check', 'Other',
] as const;

const CURRENCIES = ['USD', 'EUR', 'TRY', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'] as const;

const createExpenseSchema = z.object({
  title:           z.string().min(1, 'Başlık zorunludur.').max(200),
  category:        z.enum(EXPENSE_CATEGORIES, { errorMap: () => ({ message: 'Geçersiz kategori.' }) }),
  merchant:        z.string().max(200).optional().transform((v: string | undefined) => (v ?? '').trim() || 'Bilinmiyor'),
  date:            z.string().optional(),         // server-assigned if omitted
  amount:          z.number().positive('Tutar pozitif olmalıdır.').max(9_999_999),
  currency:        z.enum(CURRENCIES, { errorMap: () => ({ message: 'Desteklenmeyen para birimi.' }) }),
  currencySymbol:  z.string().max(5).optional(),  // server-assigned if omitted
  localAmount:     z.number().positive().max(9_999_999).optional(),
  localCurrency:   z.string().length(3).optional(),
  localSymbol:     z.string().max(5).optional(),
  exchangeRates:   z.record(z.number()).optional(),
  paymentMethod:   z.enum(PAYMENT_METHODS).optional(),
  desc:            z.string().max(2000).optional(),
  icon:            z.string().max(50).optional(),
  image:           z.string().max(500).optional(),   // S3 key
  receipt:         z.string().max(500).optional(),   // S3 key
  isReported:      z.boolean().optional(),
  teamId:          z.string().uuid('Geçersiz teamId.'),
});

const updateExpenseSchema = z.object({
  title:          z.string().min(1).max(200).optional(),
  category:       z.enum(EXPENSE_CATEGORIES).optional(),
  merchant:       z.string().min(1).max(200).optional(),
  date:           z.string().optional(),
  amount:         z.number().positive().max(9_999_999).optional(),
  currency:       z.enum(CURRENCIES).optional(),
  currencySymbol: z.string().max(5).optional(),
  localAmount:    z.number().positive().max(9_999_999).optional(),
  localCurrency:  z.string().length(3).optional(),
  localSymbol:    z.string().max(5).optional(),
  exchangeRates:  z.record(z.number()).optional(),
  paymentMethod:  z.enum(PAYMENT_METHODS).optional(),
  desc:           z.string().max(2000).optional(),
  icon:           z.string().max(50).optional(),
  image:          z.string().max(500).optional(),
  receipt:        z.string().max(500).optional(),   // S3 key
  report:         z.string().max(500).optional(),   // S3 key
});

const updateStatusSchema = z.object({
  status:          z.enum(['pending', 'approved', 'rejected']),
  rejectionReason: z.string().max(500).optional(),
});

module.exports = {
  createExpenseSchema, updateExpenseSchema, updateStatusSchema,
  EXPENSE_CATEGORIES, PAYMENT_METHODS, CURRENCIES,
};
export {};
