const { getPresignedUploadUrl, getPresignedDownloadUrl } = require('../../utils/s3');
const logger = require('../../utils/logger');

const PYTHON_ML_URL     = process.env.PYTHON_ML_URL      || 'http://localhost:8000';
const INTERNAL_API_KEY  = process.env.INTERNAL_API_KEY   || '';

class UploadService {
  // Presigned yükleme URL'i üret
  async getUploadUrl(teamId: string, ext: string) {
    return getPresignedUploadUrl(teamId, ext);
  }

  // S3 key ile fatura analizi — presigned GET URL üretip python-ml'e gönderir
  async analyzeReceipt(key: string): Promise<any> {
    // DB'den gelen key → presigned GET URL (python-ml doğrudan AWS kimlik bilgisi gerektirmez)
    const accessUrl = await getPresignedDownloadUrl(key, 120);

    const response = await fetch(`${PYTHON_ML_URL}/ml/ocr/extract-from-url`, {
      method:  'POST',
      headers: {
        'Content-Type':       'application/json',
        'X-Internal-API-Key': INTERNAL_API_KEY,
      },
      body: JSON.stringify({ url: accessUrl }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      logger.error('python-ml OCR hatası', { status: response.status, body: text }, 'upload');
      throw new Error(`ML servisi hata döndürdü: ${response.status}`);
    }

    return response.json();
  }
}

module.exports = new UploadService();
export {};
