const prisma                        = require('../../config/prisma');
const { comparePassword, hashPassword } = require('../../utils/bcrypt');
const { generateToken }             = require('../../utils/jwt');
const { generateUserId }            = require('../../utils/generateId');
const { DEFAULT_SUBSCRIPTION, DEFAULT_SETTINGS } = require('../../config/constants');
const { logUserLogin }              = require('../../utils/logWriter');
const { sendOtpEmail }              = require('../../utils/mailer');
const { isDisposableEmail }         = require('../../utils/disposableMail');

const OTP_TTL_MS   = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const SKIP_OTP     = process.env.SKIP_EMAIL_OTP === 'true';

const generateOtp = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

// payload.plan is either a plan object (from frontend) or null/string
const buildSubscription = (plan: any): Record<string, any> => {
  if (plan && typeof plan === 'object' && plan.id) {
    return {
      planId:       plan.id,
      plan:         plan.badge || (plan.name || '').toLowerCase(),
      badge:        plan.badge || null,
      price:        plan.price || 0,
      currency:     plan.currency || 'USD',
      status:       'active',
      startedAt:    new Date().toISOString(),
      teamLimit:    plan.promise?.teamLimit    || null,
      memberLimit:  plan.promise?.memberLimit  || null,
      feature_keys: plan.feature_keys || [],
    };
  }
  return DEFAULT_SUBSCRIPTION;
};

const mapUser = (user: any) => {
  const { password, stripeCustomerId, teamMemberships, ...rest } = user;
  return {
    ...rest,
    subscription: user.subscription || DEFAULT_SUBSCRIPTION,
    settings:     user.settings     || DEFAULT_SETTINGS,
    role: (teamMemberships || []).map((m: any) => ({
      teamId:      m.teamId,
      roleName:    m.roleName || 'Member',
      permissions: m.permissions || [],
    })),
    teams: (teamMemberships || []).map((m: any) => m.teamId),
  };
};

class AuthService {
  // SIGNUP — Adım 1: Doğrulama kodu gönder
  async initiateSignup(payload: any) {
    const email = (payload.email || '').trim().toLowerCase();

    // Disposable mail kontrolü
    if (isDisposableEmail(email)) {
      throw new Error('Geçici e-posta adresleri kabul edilmez. Lütfen kalıcı bir e-posta adresi girin.');
    }

    // E-posta + kullanıcı adı çakışma kontrolü
    const username = payload.username || email.split('@')[0];
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing?.email === email)      throw new Error('Bu e-posta adresi zaten kayıtlı.');
    if (existing?.username === username) throw new Error('Bu kullanıcı adı zaten alınmış.');

    // Ad + soyadı birleştir (frontend firstName + lastName gönderir)
    const name = payload.name
      || `${payload.firstName || ''} ${payload.lastName || ''}`.trim()
      || username;

    // Doğum tarihi + yaş hesabı
    const birthDate = payload.birthDate ? new Date(payload.birthDate) : null;
    const age = birthDate ? (() => {
      const today = new Date();
      let a = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) a -= 1;
      return a;
    })() : (payload.age || null);

    // Şifreyi şimdi hashle — payload'da plaintext kalmasın
    const hashedPassword = await hashPassword(payload.password);

    // SKIP_EMAIL_OTP=true: OTP atla, kullanıcıyı direkt oluştur
    if (SKIP_OTP) {
      const user = await prisma.user.create({
        data: {
          id:           generateUserId(),
          name,
          username,
          email,
          phone:        payload.phone    || null,
          address:      payload.address  || null,
          birthDate:    birthDate        || null,
          age:          age              || null,
          password:     hashedPassword,
          emailVerified: false,
          subscription: buildSubscription(payload.plan),
          settings:     DEFAULT_SETTINGS,
          status:       'active',
        },
        include: { teamMemberships: true },
      });
      const token = generateToken(user.id, user.email);
      return { message: 'Hesabınız başarıyla oluşturuldu.', token, user: mapUser(user) };
    }

    const signupPayload = {
      name,
      username,
      email,
      phone:    payload.phone    || null,
      address:  payload.address  || null,
      birthDate: birthDate ? birthDate.toISOString() : null,
      age,
      hashedPassword,
      subscription: buildSubscription(payload.plan),
      plan: payload.plan || null,
    };

    const code      = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await prisma.pendingOtp.upsert({
      where:  { email_type: { email, type: 'signup' } },
      update: { code, payload: signupPayload, expiresAt, attempts: 0 },
      create: { email, type: 'signup', code, payload: signupPayload, expiresAt },
    });

    await sendOtpEmail(email, code, 'signup');

    return { message: `Doğrulama kodu ${email} adresine gönderildi.` };
  }

  // SIGNUP — Adım 2: Kodu doğrula ve kullanıcı oluştur 
  async verifySignupOtp(email: string, code: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const safeCode = String(code).replace(/\D/g, '').slice(0, 6);

    const pending = await prisma.pendingOtp.findUnique({
      where: { email_type: { email: normalizedEmail, type: 'signup' } },
    });

    if (!pending) throw new Error('Doğrulama oturumu bulunamadı veya süresi doldu.');
    if (new Date() > pending.expiresAt) {
      await prisma.pendingOtp.delete({ where: { email_type: { email: normalizedEmail, type: 'signup' } } });
      throw new Error('Doğrulama kodunun süresi dolmuş. Lütfen tekrar kayıt olun.');
    }

    // Brute force koruması
    if (pending.attempts >= MAX_ATTEMPTS) {
      await prisma.pendingOtp.delete({ where: { email_type: { email: normalizedEmail, type: 'signup' } } });
      throw new Error('Çok fazla hatalı deneme. Lütfen tekrar kayıt olun.');
    }

    if (safeCode !== pending.code) {
      await prisma.pendingOtp.update({
        where: { email_type: { email: normalizedEmail, type: 'signup' } },
        data:  { attempts: { increment: 1 } },
      });
      throw new Error('Doğrulama kodu hatalı.');
    }

    // OTP doğru — kullanıcı oluştur
    await prisma.pendingOtp.delete({ where: { email_type: { email: normalizedEmail, type: 'signup' } } });

    const p = pending.payload as any;

    const user = await prisma.user.create({
      data: {
        id:           generateUserId(),
        name:         p.name,
        username:     p.username,
        email:        normalizedEmail,
        phone:        p.phone    || null,
        address:      p.address  || null,
        birthDate:    p.birthDate ? new Date(p.birthDate) : null,
        age:          p.age      || null,
        password:     p.hashedPassword,
        emailVerified: true,
        subscription: buildSubscription(p.plan),
        settings:     DEFAULT_SETTINGS,
        status:       'active',
      },
      include: { teamMemberships: true },
    });

    const token = generateToken(user.id, user.email);
    return { token, user: mapUser(user), message: 'Hesabınız başarıyla oluşturuldu.' };
  }

  // LOGIN — Adım 1: Kimlik kontrolü + OTP gönder
  async validateAndStartVerification(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user || user.isDeleted) throw new Error('E-posta veya şifre hatalı.');
    if (user.status === 'inactive') throw new Error('Hesabınız pasif durumdadır. Lütfen yöneticinizle iletişime geçin.');

    const isValid = await comparePassword(password, user.password);
    if (!isValid) throw new Error('E-posta veya şifre hatalı.');

    // SKIP_EMAIL_OTP=true: OTP atla, direkt token dön
    if (SKIP_OTP) {
      const userWithTeams = await prisma.user.findUnique({
        where:   { email: normalizedEmail },
        include: { teamMemberships: true },
      });
      prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } })
        .catch((err: any) => console.error('lastLogin güncelleme hatası:', err));
      logUserLogin(user.id, user.email);
      const token = generateToken(user.id, user.email);
      return { token, user: mapUser(userWithTeams!) };
    }

    const code      = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await prisma.pendingOtp.upsert({
      where:  { email_type: { email: normalizedEmail, type: 'login' } },
      update: { code, expiresAt, attempts: 0 },
      create: { email: normalizedEmail, type: 'login', code, expiresAt },
    });

    await sendOtpEmail(normalizedEmail, code, 'login');

    return {
      email:   user.email,
      userId:  user.id,
      message: `Giriş kodu ${user.email} adresine gönderildi.`,
    };
  }

  // LOGIN — Adım 2: OTP doğrula + JWT
  async verifyLoginCode(email: string, code: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const safeCode = String(code).replace(/\D/g, '').slice(0, 6);

    const pending = await prisma.pendingOtp.findUnique({
      where: { email_type: { email: normalizedEmail, type: 'login' } },
    });

    if (!pending) throw new Error('Giriş doğrulama oturumu bulunamadı veya süresi doldu.');
    if (new Date() > pending.expiresAt) {
      await prisma.pendingOtp.delete({ where: { email_type: { email: normalizedEmail, type: 'login' } } });
      throw new Error('Doğrulama kodunun süresi dolmuş.');
    }

    if (pending.attempts >= MAX_ATTEMPTS) {
      await prisma.pendingOtp.delete({ where: { email_type: { email: normalizedEmail, type: 'login' } } });
      throw new Error('Çok fazla hatalı deneme. Lütfen tekrar giriş yapın.');
    }

    if (safeCode !== pending.code) {
      await prisma.pendingOtp.update({
        where: { email_type: { email: normalizedEmail, type: 'login' } },
        data:  { attempts: { increment: 1 } },
      });
      throw new Error('Doğrulama kodu hatalı.');
    }

    await prisma.pendingOtp.delete({ where: { email_type: { email: normalizedEmail, type: 'login' } } });

    // userId'yi OTP'den değil, email ile user tablosundan al
    const user = await prisma.user.findUnique({
      where:   { email: normalizedEmail },
      include: { teamMemberships: true },
    });
    if (!user) throw new Error('Kullanıcı bulunamadı.');

    prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } })
      .catch((err: any) => console.error('lastLogin güncelleme hatası:', err));

    logUserLogin(user.id, user.email);

    const token = generateToken(user.id, user.email);
    return { token, user: mapUser(user) };
  }

  // Eski doğrudan kayıt (admin/test endpoint'i)
  async registerUser(payload: any) {
    const email = (payload.email || '').trim().toLowerCase();

    if (isDisposableEmail(email)) {
      throw new Error('Geçici e-posta adresleri kabul edilmez.');
    }

    const username = payload.username || email.split('@')[0];
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing?.email === email)      throw new Error('Bu e-posta zaten kayıtlı.');
    if (existing?.username === username) throw new Error('Bu kullanıcı adı zaten alınmış.');

    const name = payload.name
      || `${payload.firstName || ''} ${payload.lastName || ''}`.trim()
      || username;

    const birthDate = payload.birthDate ? new Date(payload.birthDate) : null;
    const age = payload.age || (birthDate ? (() => {
      const today = new Date();
      let a = today.getFullYear() - birthDate!.getFullYear();
      const m = today.getMonth() - birthDate!.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate!.getDate())) a -= 1;
      return a;
    })() : null);

    const hashedPassword = await hashPassword(payload.password);

    const user = await prisma.user.create({
      data: {
        id:           generateUserId(),
        name,
        username,
        email,
        phone:        payload.phone    || null,
        address:      payload.address  || null,
        birthDate,
        age,
        password:     hashedPassword,
        emailVerified: false,
        subscription: buildSubscription(payload.plan),
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
