import { randomUUID } from 'crypto';

// ID Üreticiler 
// Prefix + UUID formatı: "U3f2a1b4c-..." gibi
// Prisma'ya her zaman açıkça geçilmeli — @default(uuid()) yalnızca fallback.

const generateId    = (prefix = ''): string => `${prefix}${randomUUID()}`;

// Kullanıcı ID'leri her zaman 'U' harfiyle başlar (ID karmaşasını önler)
const generateUserId = (): string => generateId('U');

// Diğer entityler için standart UUID (prefix yok)
const generateTeamId         = (): string => generateId();
const generateNotificationId = (): string => generateId();
const generatePaymentId      = (): string => generateId();

module.exports = { generateId, generateUserId, generateTeamId, generateNotificationId, generatePaymentId };
export {};
