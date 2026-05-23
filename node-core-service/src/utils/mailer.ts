const nodemailer = require('nodemailer');

const SMTP_HOST  = process.env.SMTP_HOST  || '';
const SMTP_PORT  = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER  = process.env.SMTP_USER  || '';
const SMTP_PASS  = process.env.SMTP_PASS  || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@flowtera.app';
const APP_URL    = process.env.APP_URL    || 'http://localhost:5173';

const transporter = nodemailer.createTransport({
  host:   SMTP_HOST,
  port:   SMTP_PORT,
  secure: false,
  auth:   { user: SMTP_USER, pass: SMTP_PASS },
});

interface MailOptions {
  to:      string;
  subject: string;
  html:    string;
}

const sendMail = async (options: MailOptions): Promise<void> => {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    // SMTP yapılandırılmamış — geliştirme konsol modu
    console.log('\n[MAILER] SMTP eksik — konsol fallback:');
    console.log(`  Kime  : ${options.to}`);
    console.log(`  Konu  : ${options.subject}`);
    return;
  }
  await transporter.sendMail({ from: FROM_EMAIL, ...options });
};

const sendOtpEmail = async (email: string, code: string, purpose: 'signup' | 'login'): Promise<void> => {
  const label = purpose === 'signup' ? 'Kayıt Doğrulama' : 'Giriş Doğrulama';
  await sendMail({
    to:      email,
    subject: `FlowTera — ${label} Kodunuz`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;">
        <h2 style="color:#6366f1;margin:0 0 8px;">FlowTera</h2>
        <p style="color:#444;margin:0 0 24px;">${label}</p>
        <p style="margin:0 0 16px;">Doğrulama kodunuz:</p>
        <div style="letter-spacing:12px;font-size:36px;font-weight:700;color:#111;
                    background:#f5f5f5;border-radius:8px;padding:16px 24px;
                    text-align:center;width:fit-content;margin:0 auto 24px;">
          ${code}
        </div>
        <p style="color:#666;font-size:13px;margin:0 0 8px;">
          Bu kod <strong>5 dakika</strong> geçerlidir.
        </p>
        <p style="color:#666;font-size:13px;margin:0;">
          Bu isteği siz yapmadıysanız görmezden gelin.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#999;font-size:12px;margin:0;">© FlowTera — Kurumsal Harcama Yönetimi</p>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async (email: string, resetToken: string): Promise<void> => {
  const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;
  await sendMail({
    to:      email,
    subject: 'FlowTera — Şifre Sıfırlama Talebi',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;">
        <h2 style="color:#6366f1;margin:0 0 8px;">FlowTera</h2>
        <p style="color:#444;margin:0 0 24px;">Şifre Sıfırlama</p>
        <p>Hesabınız için şifre sıfırlama talebinde bulundunuz.</p>
        <a href="${resetLink}"
           style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;
                  border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
          Şifremi Sıfırla
        </a>
        <p style="color:#666;font-size:13px;">
          Bu bağlantı <strong>1 saat</strong> geçerlidir.<br>
          Bu isteği siz yapmadıysanız görmezden gelin.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#999;font-size:12px;">© FlowTera — Kurumsal Harcama Yönetimi</p>
      </div>
    `,
  });
};

// SMS altyapısı — şu an devre dışı (Twilio / Netgsm entegrasyonu için hazır)
const sendPasswordResetSms = async (phone: string, _resetToken: string): Promise<void> => {
  console.log(`[SMS DEVRE DIŞI] Alıcı: ${phone} — SMS entegrasyonu henüz bağlanmadı.`);
};

const sendSmsOtp = async (phone: string, _code: string): Promise<void> => {
  console.log(`[SMS DEVRE DIŞI] Alıcı: ${phone} — SMS OTP entegrasyonu henüz bağlanmadı.`);
};

module.exports = { sendMail, sendOtpEmail, sendPasswordResetEmail, sendPasswordResetSms, sendSmsOtp };
export {};
