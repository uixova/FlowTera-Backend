const { getPresignedUploadUrl, getPresignedDownloadUrl } = require('../../utils/s3');
const logger   = require('../../utils/logger');
const FormData = require('form-data');

const PYTHON_ML_URL     = process.env.PYTHON_ML_URL      || 'http://localhost:8000';
const INTERNAL_API_KEY  = process.env.INTERNAL_API_KEY   || '';

class UploadService {
  // Presigned yükleme URL'i üret
  async getUploadUrl(teamId: string, ext: string) {
    return getPresignedUploadUrl(teamId, ext);
  }

  // ML hata nesnesine HTTP status ekle → controller doğru kodu döndürebilir
  private _mlError(status: number, body: string): Error {
    let detail = body;
    try { detail = JSON.parse(body)?.detail || body; } catch { /* raw text */ }
    const err: any = new Error(detail || `OCR servisi hata döndürdü (${status})`);
    err.statusCode  = status;
    return err;
  }

  // S3 key ile fatura analizi — presigned GET URL üretip python-ml'e gönderir
  async analyzeReceipt(key: string): Promise<any> {
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
      throw this._mlError(response.status, text);
    }

    return response.json();
  }

  // Direct file proxy — raw file buffer POSTed to Python ML service without S3 round-trip
  async analyzeReceiptDirect(fileBuffer: Buffer, originalname: string, mimetype: string): Promise<any> {
    const form = new FormData();
    form.append('file', fileBuffer, { filename: originalname, contentType: mimetype });

    const response = await fetch(`${PYTHON_ML_URL}/ml/ocr/parse-invoice`, {
      method:  'POST',
      headers: {
        ...form.getHeaders(),
        'X-Internal-API-Key': INTERNAL_API_KEY,
      },
      body: form.getBuffer(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      logger.error('python-ml OCR direct hatası', { status: response.status, body: text }, 'upload');
      throw this._mlError(response.status, text);
    }

    return response.json();
  }
}

module.exports = new UploadService();
export {};
