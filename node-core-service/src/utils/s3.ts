const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { randomUUID }   = require('crypto');
const logger           = require('./logger');

const BUCKET         = process.env.AWS_S3_BUCKET     || '';
const REGION         = process.env.AWS_S3_REGION     || 'eu-central-1';
const UPLOAD_EXPIRES = parseInt(process.env.AWS_S3_UPLOAD_EXPIRES || '300', 10);  // 5 dakika

// Statik taban URL — key ile birleştirilerek tam URL oluşturulur
const S3_BASE_URL = process.env.AWS_S3_BASE_URL || `https://${BUCKET}.s3.${REGION}.amazonaws.com`;

// S3 key'inden statik URL üretir (DB'de key saklanır, URL hesaplanır)
const keyToUrl = (key: string): string => `${S3_BASE_URL}/${key}`;

// S3 istemcisi — AWS_ACCESS_KEY_ID ve AWS_SECRET_ACCESS_KEY env'den otomatik alınır
const s3 = new S3Client({ region: REGION });

// Dosya uzantısına göre Content-Type
const extToMime: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png:  'image/png',  webp: 'image/webp',
  pdf:  'application/pdf',
};

// User avatar presigned upload URL
const getAvatarUploadUrl = async (userId: string, ext: string): Promise<{ uploadUrl: string; fileUrl: string; key: string }> => {
  if (!BUCKET) throw new Error('AWS_S3_BUCKET yapılandırılmamış.');
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '');
  const key     = `users/${userId}/avatar.${safeExt}`;
  const mime    = extToMime[safeExt] || 'image/jpeg';
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: mime });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: UPLOAD_EXPIRES });
  const fileUrl   = `${S3_BASE_URL}/${key}`;
  return { uploadUrl, fileUrl, key };
};

// Team image presigned upload URL
const getTeamImageUploadUrl = async (teamId: string, ext: string): Promise<{ uploadUrl: string; fileUrl: string; key: string }> => {
  if (!BUCKET) throw new Error('AWS_S3_BUCKET yapılandırılmamış.');
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '');
  const key     = `teams/${teamId}/image.${safeExt}`;
  const mime    = extToMime[safeExt] || 'image/jpeg';
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: mime });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: UPLOAD_EXPIRES });
  const fileUrl   = `${S3_BASE_URL}/${key}`;
  return { uploadUrl, fileUrl, key };
};

// Presigned PUT URL — istemci doğrudan S3'e yükler (sunucu araya girmez)
// Döner: { uploadUrl, fileUrl, key }
const getPresignedUploadUrl = async (teamId: string, ext: string): Promise<{ uploadUrl: string; fileUrl: string; key: string }> => {
  if (!BUCKET) throw new Error('AWS_S3_BUCKET yapılandırılmamış.');
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '');
  const key     = `teams/${teamId}/receipts/${randomUUID()}.${safeExt}`;
  const mime    = extToMime[safeExt] || 'application/octet-stream';

  const command = new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    ContentType: mime,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: UPLOAD_EXPIRES });
  const fileUrl   = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

  return { uploadUrl, fileUrl, key };
};

// Presigned GET URL — python-ml veya frontend geçici erişim için
const getPresignedDownloadUrl = async (key: string, expiresIn = 300): Promise<string> => {
  if (!BUCKET) throw new Error('AWS_S3_BUCKET yapılandırılmamış.');
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
};

// S3 key'ini URL'den çıkar
// "https://bucket.s3.region.amazonaws.com/teams/xxx/receipts/file.jpg" → "teams/xxx/receipts/file.jpg"
const extractKeyFromUrl = (fileUrl: string): string | null => {
  try {
    const url  = new URL(fileUrl);
    const path = url.pathname.replace(/^\//, '');
    return path || null;
  } catch {
    return null;
  }
};

// S3 nesnesi sil
const deleteS3Object = async (key: string): Promise<void> => {
  if (!BUCKET) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (err) {
    logger.warn('S3 nesne silme hatası', { key, err }, 'storage');
  }
};

module.exports = { getPresignedUploadUrl, getAvatarUploadUrl, getTeamImageUploadUrl, getPresignedDownloadUrl, extractKeyFromUrl, deleteS3Object, keyToUrl, S3_BASE_URL };
export {};
