const prisma          = require('../../config/prisma');
const { comparePassword, hashPassword } = require('../../utils/bcrypt');
const { generateToken }                 = require('../../utils/jwt');
const { generateUserId }                = require('../../utils/generateId');
const { DEFAULT_SUBSCRIPTION, DEFAULT_SETTINGS } = require('../../config/constants');
const { logUserLogin }                  = require('../../utils/logWriter');

// Geçici 2FA kod deposu — üretimde Redis'e taşınacak
const pendingVerifications = new Map<string, { code: string; userId: string; expiresAt: number }>();

// Prisma user nesnesini frontend User tipine dönüştürür — hassas alanlar çıkarılır
const mapUser = (user: any) => {
  const { password, stripeCustomerId, teamMemberships, ...rest } = user;
  return {
    ...rest,
    subscription: user.subscription || DEFAULT_SUBSCRIPTION,
    settings:     user.settings     || DEFAULT_SETTINGS,
    role: (teamMemberships || []).map((m: any) => ({
      teamId:      m.teamId,
      role:        (m.roleName || 'Member').toLowerCase(),
      permissions: m.permissions || [],
    })),
    teams: (teamMemberships || []).map((m: any) => m.teamId),
  };
};

// Kullanıcıyı ilişkileriyle birlikte çeker
const findUserWithMemberships = (id: string) =>
  prisma.user.findUnique({
    where:   { id },
    include: { teamMemberships: true },
  });

class AuthService {
  // Adım 1 — E-posta + şifre kontrolü, 2FA kodu üret
  async validateAndStartVerification(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user || user.isDeleted) {
      throw new Error('E-posta veya şifre hatalı.');
    }
    if (user.status === 'inactive') {
      throw new Error('Hesabınız pasif durumdadır. Lütfen yöneticinizle iletişime geçin.');
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) throw new Error('E-posta veya şifre hatalı.');

    // Simülasyon: sabit kod. Üretimde: Math.floor(100000 + Math.random() * 900000).toString()
    const verificationCode = '000000';
    const expiresAt        = Date.now() + 5 * 60 * 1000;

    pendingVerifications.set(normalizedEmail, { code: verificationCode, userId: user.id, expiresAt });

    return {
      email:    user.email,
      userId:   user.id,
      message:  `Giriş kodu ${user.email} adresine gönderildi (simülasyon).`,
      codeHint: verificationCode,
    };
  }

  // Adım 2 — OTP doğrulama + JWT token
  async verifyLoginCode(email: string, code: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const pending         = pendingVerifications.get(normalizedEmail);

    if (!pending) throw new Error('Giriş doğrulama oturumu bulunamadı veya süresi doldu.');
    if (Date.now() > pending.expiresAt) {
      pendingVerifications.delete(normalizedEmail);
      throw new Error('Doğrulama kodunun süresi dolmuş.');
    }

    const safeCode = String(code).replace(/\D/g, '').slice(0, 6);
    if (safeCode !== pending.code) throw new Error('Doğrulama kodu hatalı.');

    pendingVerifications.delete(normalizedEmail);

    const user = await findUserWithMemberships(pending.userId);
    if (!user) throw new Error('Kullanıcı bulunamadı.');

    // Son giriş tarihini güncelle (fire & forget)
    prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } })
      .catch((err: any) => console.error('lastLogin güncelleme hatası:', err));

    // UserLog — giriş kaydı
    logUserLogin(user.id, user.email);

    const token = generateToken(user.id, user.email);

    return { token, user: mapUser(user) };
  }

  // Kayıt — yeni kullanıcı oluşturma
  async registerUser(payload: any) {
    const email = payload.email.trim().toLowerCase();

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username: payload.username }] },
    });
    if (existing?.email === email)    throw new Error('Bu e-posta zaten kayıtlı.');
    if (existing?.username === payload.username) throw new Error('Bu kullanıcı adı zaten alınmış.');

    const hashedPassword = await hashPassword(payload.password);

    const user = await prisma.user.create({
      data: {
        id:           generateUserId(),   // Her User ID'si 'U' harfiyle başlar
        name:         payload.name,
        username:     payload.username,
        email,
        phone:        payload.phone    || null,
        age:          payload.age      || null,
        address:      payload.address  || null,
        password:     hashedPassword,
        subscription: payload.subscription || DEFAULT_SUBSCRIPTION,
        settings:     DEFAULT_SETTINGS,
        status:       'active',
      },
      include: { teamMemberships: true },
    });

    const token = generateToken(user.id, user.email);
    return { token, user: mapUser(user) };
  }
}

module.exports = new AuthService();
export {};
