// Pagination 
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE     = 200;
const LOG_PAGE_SIZE     = 50;   // Aktivite log varsayılan sayfa boyutu

// RBAC Rolleri 
const ROLES = {
  ADMIN:     'Admin',
  MODERATOR: 'Moderator',
  MEMBER:    'Member',
} as const;

// Auth / OTP 
const OTP_TTL_MS    = 5 * 60 * 1000;  // OTP geçerlilik süresi: 5 dakika
const MAX_OTP_ATTEMPTS = 5;            // Max OTP deneme sayısı (sonra session silinir)
const JWT_EXPIRES_IN   = '7d';         // JWT token ömrü

// S3 / Presigned URL 
const S3_UPLOAD_EXPIRES_SEC   = 300;   // Upload presigned URL TTL: 5 dakika
const S3_DOWNLOAD_EXPIRES_SEC = 300;   // Makbuz indirme presigned URL TTL: 5 dakika
const S3_TEAM_VIEW_EXPIRES_SEC = 3600; // Takım görsel presigned URL TTL: 1 saat

// Plan Limitleri (Free Plan varsayılanları) 
const FREE_MAX_TEAMS   = 1;
const FREE_MAX_MEMBERS = 5;

// Varsayılan Abonelik 
const DEFAULT_SUBSCRIPTION = {
  planId:            '',
  plan:              'free',
  maxTeams:          FREE_MAX_TEAMS,
  maxMembersPerTeam: FREE_MAX_MEMBERS,
  usage:             { ocr: 0, aiAnaliz: 0 },
  feature_keys:      [] as string[],
};

// Varsayılan Kullanıcı Ayarları 
const DEFAULT_SETTINGS = {
  theme:         'light',
  language:      'tr',
  notifications: { email: true, sms: false, push: true },
};

module.exports = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  LOG_PAGE_SIZE,
  ROLES,
  OTP_TTL_MS,
  MAX_OTP_ATTEMPTS,
  JWT_EXPIRES_IN,
  S3_UPLOAD_EXPIRES_SEC,
  S3_DOWNLOAD_EXPIRES_SEC,
  S3_TEAM_VIEW_EXPIRES_SEC,
  FREE_MAX_TEAMS,
  FREE_MAX_MEMBERS,
  DEFAULT_SUBSCRIPTION,
  DEFAULT_SETTINGS,
};
export {};
