const { z } = require('zod');

const createExpenseSchema = z.object({
  title:           z.string().min(1, 'Başlık zorunludur.'),
  category:        z.string().min(1, 'Kategori zorunludur.'),
  merchant:        z.string().min(1, 'Satıcı zorunludur.'),
  date:            z.string().min(1, 'Tarih zorunludur.'),
  amount:          z.number().positive('Tutar pozitif olmalıdır.'),
  currency:        z.string().length(3, 'Para birimi 3 karakterli olmalıdır.'),
  currencySymbol:  z.string().min(1),
  localAmount:     z.number().optional(),
  localCurrency:   z.string().optional(),
  localSymbol:     z.string().optional(),
  exchangeRates:   z.record(z.number()).optional(),
  paymentMethod:   z.string().optional(),
  desc:            z.string().optional(),
  icon:            z.string().optional(),
  teamId:          z.string().uuid('Geçersiz teamId.'),
});

const updateExpenseSchema = z.object({
  title:          z.string().min(1).optional(),
  category:       z.string().optional(),
  merchant:       z.string().optional(),
  date:           z.string().optional(),
  amount:         z.number().positive().optional(),
  currency:       z.string().length(3).optional(),
  currencySymbol: z.string().optional(),
  localAmount:    z.number().optional(),
  localCurrency:  z.string().optional(),
  localSymbol:    z.string().optional(),
  exchangeRates:  z.record(z.number()).optional(),
  paymentMethod:  z.string().optional(),
  desc:           z.string().optional(),
  icon:           z.string().optional(),
  report:         z.string().optional(),
});

const updateStatusSchema = z.object({
  status:          z.enum(['pending', 'approved', 'rejected']),
  rejectionReason: z.string().optional(),
});

module.exports = { createExpenseSchema, updateExpenseSchema, updateStatusSchema };
export {};
