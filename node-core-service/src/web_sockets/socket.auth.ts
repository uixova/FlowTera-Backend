const { verifyToken } = require('../utils/jwt');

// WS Kimlik Doğrulama Payload 
export interface WsAuthPayload {
  userId: string;
  email:  string;
  teamId: string;
  role:   string;  // Admin | Moderator | Member
}

// WS Bağlantı Doğrulayıcı
// İki mod desteklenir:
//   1. Güvenli mod: ?token=JWT&teamId=xxx&role=Admin  (üretim için)
//   2. Uyumluluk modu: ?userId=xxx&teamId=xxx         (frontend mevcut implementasyonu)
//
// Üretimde sadece token modu kullanılmalıdır.
// userId modu yalnızca geliştirme ortamında (NODE_ENV !== 'production') çalışır.
const verifyWsAuth = (params: URLSearchParams): WsAuthPayload | null => {
  const teamId = params.get('teamId');
  if (!teamId) return null;

  // Güvenli Mod: JWT Token 
  const token = params.get('token');
  if (token) {
    try {
      const payload = verifyToken(token) as { userId: string; email: string };
      if (!payload?.userId) return null;

      const role = params.get('role') || 'Member';
      return { userId: payload.userId, email: payload.email, teamId, role };
    } catch {
      return null; // Geçersiz token — bağlantıyı reddet
    }
  }

  // Uyumluluk Modu: Doğrudan userId 
  // Üretimde devre dışı — güvenlik riski taşır
  const userId = params.get('userId');
  if (userId && process.env.NODE_ENV !== 'production') {
    const role = params.get('role') || 'Member';
    return { userId, email: '', teamId, role };
  }

  return null;
};

module.exports = { verifyWsAuth };
export {};
