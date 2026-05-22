// Standart API Yanıt Üreticileri 
// Tüm controller'lar bu yardımcıları kullanarak tutarlı yanıt formatı sağlar.
// Format: { status, data?, message?, meta? }

const success = (res: any, data: unknown, status = 200) =>
  res.status(status).json({ status: 'OK', data });

const created = (res: any, data: unknown) =>
  res.status(201).json({ status: 'OK', data });

const paginated = (
  res:  any,
  data: unknown[],
  meta: { page: number; pageSize: number; totalCount: number; totalPages: number; hasMore: boolean },
) =>
  res.status(200).json({ status: 'OK', data, meta });

const error = (res: any, message: string, statusCode = 400, extra?: Record<string, unknown>) =>
  res.status(statusCode).json({ status: 'ERROR', message, ...extra });

const notFound = (res: any, entity = 'Kayıt') =>
  res.status(404).json({ status: 'ERROR', message: `${entity} bulunamadı.` });

const forbidden = (res: any, message = 'Bu işlem için yetkiniz bulunmamaktadır.') =>
  res.status(403).json({ status: 'ERROR', message });

const unauthorized = (res: any, message = 'Yetkisiz erişim.') =>
  res.status(401).json({ status: 'ERROR', message });

module.exports = { success, created, paginated, error, notFound, forbidden, unauthorized };
export {};
