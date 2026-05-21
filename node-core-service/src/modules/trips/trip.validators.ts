const { z } = require('zod');

const createTripSchema = z.object({
  title:          z.string().min(1, 'Başlık zorunludur.'),
  category:       z.string().min(1, 'Kategori zorunludur.'),
  destination:    z.string().min(1, 'Varış noktası zorunludur.'),
  vehicle:        z.string().min(1, 'Araç türü zorunludur.'),
  date:           z.string().min(1, 'Tarih zorunludur.'),
  startDate:      z.string().optional(),
  endDate:        z.string().optional(),
  duration:       z.string().optional(),
  amount:         z.number().positive('Tutar pozitif olmalıdır.'),
  currency:       z.string().length(3),
  currencySymbol: z.string().min(1),
  localAmount:    z.number().optional(),
  localCurrency:  z.string().optional(),
  localSymbol:    z.string().optional(),
  exchangeRates:  z.record(z.number()).optional(),
  desc:           z.string().optional(),
  icon:           z.string().optional(),
  report:         z.string().optional(),
  teamId:         z.string().uuid('Geçersiz teamId.'),
});

const updateTripSchema = z.object({
  title:           z.string().min(1).optional(),
  category:        z.string().optional(),
  destination:     z.string().optional(),
  vehicle:         z.string().optional(),
  date:            z.string().optional(),
  startDate:       z.string().optional(),
  endDate:         z.string().optional(),
  duration:        z.string().optional(),
  amount:          z.number().positive().optional(),
  currency:        z.string().length(3).optional(),
  currencySymbol:  z.string().optional(),
  localAmount:     z.number().optional(),
  localCurrency:   z.string().optional(),
  localSymbol:     z.string().optional(),
  exchangeRates:   z.record(z.number()).optional(),
  desc:            z.string().optional(),
  icon:            z.string().optional(),
  report:          z.string().optional(),
  status:          z.string().optional(),
  statusClass:     z.string().optional(),
  rejectionReason: z.string().optional(),
});

module.exports = { createTripSchema, updateTripSchema };
export {};
