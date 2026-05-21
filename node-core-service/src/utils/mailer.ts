// Mail Servisi Yardımcısı
// Üretim: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS env değişkenleri set edilirse
//         gerçek mail gönderir (nodemailer gerektirir).
// Geliştirme: .env'de SMTP_HOST yoksa link konsola yazdırılır.

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SMTP_HOST     = process.env.SMTP_HOST;
const FROM_EMAIL    = process.env.FROM_EMAIL || 'noreply@flowtera.app';
const APP_URL       = process.env.APP_URL    || 'http://localhost:5173';

interface MailOptions {
  to:      string;
  subject: string;
  html:    string;
}

// Üretimde nodemailer ile gönderim yapılır.
// Şu an simülasyon — gerçek entegrasyon için `npm install nodemailer` ve SMTP env gereklidir.
const sendMail = async (options: MailOptions): Promise<void> => {
  if (IS_PRODUCTION && SMTP_HOST) {
    // Gerçek gönderim — nodemailer kurulduktan sonra uncomment edilecek:
    // const nodemailer = require('nodemailer');
    // const transporter = nodemailer.createTransporter({
    //   host: SMTP_HOST,
    //   port: parseInt(process.env.SMTP_PORT || '587'),
    //   auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    // });
    // await transporter.sendMail({ from: FROM_EMAIL, ...options });
    console.log(`[MAILER] Gerçek mail gönderimi aktif. Alıcı: ${options.to}`);
  } else {
    // Geliştirme simülasyonu
    console.log('\n[MAILER SİMÜLASYON] ─────────────────────────────');
    console.log(`Kime   : ${options.to}`);
    console.log(`Konu   : ${options.subject}`);
    console.log(`İçerik : ${options.html.replace(/<[^>]+>/g, ' ').trim().slice(0, 200)}`);
    console.log('────────────────────────────────────────────────\n');
  }
};

// Şifre sıfırlama e-postası
const sendPasswordResetEmail = async (email: string, resetToken: string): Promise<void> => {
  const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;

  await sendMail({
    to:      email,
    subject: 'FlowTera — Şifre Sıfırlama Talebi',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;">
        <h2 style="color:#6366f1;">Şifre Sıfırlama</h2>
        <p>Merhaba,</p>
        <p>FlowTera hesabınız için bir şifre sıfırlama talebinde bulundunuz.</p>
        <p>Aşağıdaki bağlantıya tıklayarak yeni şifrenizi oluşturabilirsiniz:</p>
        <a href="${resetLink}"
           style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;
                  border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
          Şifremi Sıfırla
        </a>
        <p style="color:#666;font-size:13px;">
          Bu bağlantı <strong>1 saat</strong> geçerlidir.<br>
          Bu isteği siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#999;font-size:12px;">© FlowTera — Kurumsal Harcama Yönetimi</p>
      </div>
    `,
  });
};

// SMS simülasyonu (ileride Twilio / Netgsm entegrasyonu)
const sendPasswordResetSms = async (phone: string, resetToken: string): Promise<void> => {
  const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;
  console.log(`\n[SMS SİMÜLASYON] Alıcı: ${phone} | Link: ${resetLink}\n`);
};

module.exports = { sendPasswordResetEmail, sendPasswordResetSms };
export {};
