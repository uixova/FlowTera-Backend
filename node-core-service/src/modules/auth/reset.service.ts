const prisma      = require('../../config/prisma');
const crypto      = require('crypto');
const { hashPassword }           = require('../../utils/bcrypt');
const { sendPasswordResetEmail, sendPasswordResetSms } = require('../../utils/mailer');

const TOKEN_EXPIRES_MS = 60 * 60 * 1000; // 1 saat

class ResetService {
  // Adım 1 — Kullanıcıyı bul, token üret, mail/SMS gönder
  async requestReset(identifier: string, channel: 'email' | 'sms') {
    const normalizedIdentifier = identifier.trim().toLowerCase();

    // E-posta veya telefon numarasıyla kullanıcıyı bul
    const user = await prisma.user.findFirst({
      where: {
        isDeleted: false,
        OR: [
          { email: normalizedIdentifier },
          { phone: identifier.trim() },
        ],
      },
    });

    // Güvenlik: kullanıcı bulunsun ya da bulunmasın aynı mesajı dön
    // (e-posta enumeration saldırısını önlemek için)
    if (!user) {
      return {
        success: true,
        message: 'Eğer bu bilgiyle kayıtlı bir hesap varsa, sıfırlama bağlantısı gönderildi.',
      };
    }

    // Eski token'ları iptal et (tek aktif token politikası)
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data:  { used: true },
    });

    // Yeni token üret (64 byte hex → 128 karakter)
    const rawToken  = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRES_MS);

    await prisma.passwordResetToken.create({
      data: { token: rawToken, userId: user.id, expiresAt },
    });

    // Gönderim — SMTP/SMS hatası kullanıcıya yansıtılmaz (enumeration koruması)
    try {
      if (channel === 'sms' && user.phone) {
        await sendPasswordResetSms(user.phone, rawToken);
      } else {
        await sendPasswordResetEmail(user.email, rawToken);
      }
    } catch (mailErr: any) {
      console.error('[RESET] Gönderim başarısız (SMTP/SMS):', mailErr.message);
    }

    return {
      success: true,
      message: 'Eğer bu bilgiyle kayıtlı bir hesap varsa, sıfırlama bağlantısı gönderildi.',
      ...(process.env.NODE_ENV !== 'production' && { tokenHint: rawToken }),
    };
  }

  // Adım 2 — Token'ı doğrula ve şifreyi güncelle
  async resetPassword(token: string, newPassword: string) {
    if (!token || token.length < 64) {
      throw new Error('Geçersiz sıfırlama bağlantısı.');
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record)          throw new Error('Sıfırlama bağlantısı bulunamadı veya kullanılmış.');
    if (record.used)      throw new Error('Bu sıfırlama bağlantısı daha önce kullanılmış.');
    if (new Date() > record.expiresAt) {
      await prisma.passwordResetToken.update({ where: { token }, data: { used: true } });
      throw new Error('Sıfırlama bağlantısının süresi dolmuş. Lütfen yeni bir talepte bulunun.');
    }

    const hashed = await hashPassword(newPassword);

    // Şifreyi güncelle ve token'ı kullanıldı olarak işaretle (transaction)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data:  { password: hashed },
      }),
      prisma.passwordResetToken.update({
        where: { token },
        data:  { used: true },
      }),
    ]);

    return { success: true, message: 'Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.' };
  }

  // Token geçerli mi kontrolü (frontend "link tıklandı" anında çağırır)
  async validateToken(token: string) {
    if (!token) throw new Error('Token zorunludur.');

    const record = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!record || record.used) {
      return { valid: false, message: 'Geçersiz veya kullanılmış bağlantı.' };
    }
    if (new Date() > record.expiresAt) {
      return { valid: false, message: 'Bağlantının süresi dolmuş.' };
    }

    return { valid: true, userId: record.userId };
  }
}

module.exports = new ResetService();
export {};
