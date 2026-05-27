const { z } = require('zod');
const { CURRENCIES } = require('../expenses/expense.validators');

const TRIP_CATEGORIES = [
  'Business', 'Vacation', 'Event', 'Conference', 'Training', 'Other',
] as const;

const TRIP_VEHICLES = [
  'Plane', 'Train', 'Car', 'Bus', 'Ship', 'Taxi', 'Motorcycle', 'Other',
] as const;

const TRIP_STATUSES = [
  'pending', 'approved', 'rejected', 'onroad', 'completed',
] as const;

const createTripSchema = z.object({
  title:          z.string().min(1, 'Başlık zorunludur.').max(200),
  category:       z.enum(TRIP_CATEGORIES, { errorMap: () => ({ message: 'Geçersiz gezi kategorisi.' }) }),
  destination:    z.string().min(1, 'Varış noktası zorunludur.').max(200),
  vehicle:        z.enum(TRIP_VEHICLES, { errorMap: () => ({ message: 'Geçersiz araç türü.' }) }),
  date:           z.string().optional(),         // server-assigned if omitted
  startDate:      z.string().optional(),
  endDate:        z.string().optional(),
  duration:       z.string().max(50).optional(),
  amount:         z.number().min(0, 'Tutar negatif olamaz.').max(9_999_999).optional().default(0),
  currency:       z.enum(CURRENCIES, { errorMap: () => ({ message: 'Desteklenmeyen para birimi.' }) }),
  currencySymbol: z.string().max(5).optional(),  // server-assigned if omitted
  localAmount:    z.number().positive().max(9_999_999).optional(),
  localCurrency:  z.string().length(3).optional(),
  localSymbol:    z.string().max(5).optional(),
  exchangeRates:  z.record(z.number()).optional(),
  desc:           z.string().max(2000).optional(),
  icon:           z.string().max(50).optional(),
  report:         z.string().max(500).optional(),
  teamId:         z.string().uuid('Geçersiz teamId.'),
});

const updateTripSchema = z.object({
  title:          z.string().min(1).max(200).optional(),
  category:       z.enum(TRIP_CATEGORIES).optional(),
  destination:    z.string().min(1).max(200).optional(),
  vehicle:        z.enum(TRIP_VEHICLES).optional(),
  date:           z.string().optional(),
  startDate:      z.string().optional(),
  endDate:        z.string().optional(),
  duration:       z.string().max(50).optional(),
  amount:         z.number().positive().max(9_999_999).optional(),
  currency:       z.enum(CURRENCIES).optional(),
  currencySymbol: z.string().max(5).optional(),
  localAmount:    z.number().positive().max(9_999_999).optional(),
  localCurrency:  z.string().length(3).optional(),
  localSymbol:    z.string().max(5).optional(),
  exchangeRates:  z.record(z.number()).optional(),
  desc:           z.string().max(2000).optional(),
  icon:           z.string().max(50).optional(),
  report:         z.string().max(500).optional(),
});

const updateTripStatusSchema = z.object({
  status:          z.enum(TRIP_STATUSES, { errorMap: () => ({ message: 'Geçersiz durum değeri.' }) }),
  rejectionReason: z.string().max(500).optional(),
});

module.exports = { createTripSchema, updateTripSchema, updateTripStatusSchema, TRIP_CATEGORIES, TRIP_VEHICLES };
export {};
