const uploadService = require('./upload.service');
const { getPresignedDownloadUrl } = require('../../utils/s3');

class UploadController {
  // GET /uploads/presigned?ext=jpg&teamId=xxx
  // Presigned PUT URL + key döner; frontend key'i DB'ye kaydeder
  async getPresignedUrl(req: any, res: any, next: any) {
    try {
      const { ext, teamId } = req.query;
      if (!ext || !teamId) {
        return res.status(400).json({ status: 'ERROR', message: 'ext ve teamId zorunludur.' });
      }
      const allowed = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
      if (!allowed.includes((ext as string).toLowerCase())) {
        return res.status(400).json({ status: 'ERROR', message: 'İzin verilen uzantılar: jpg, png, webp, pdf' });
      }
      const result = await uploadService.getUploadUrl(teamId as string, ext as string);
      // result: { uploadUrl, fileUrl, key } — frontend key'i DB receipt alanına yazar
      return res.status(200).json({ status: 'OK', data: result });
    } catch (error) { next(error); }
  }

  // GET /uploads/view?key=teams/xxx/receipts/file.jpg
  // Özel bucket için presigned GET URL döner (geçici erişim)
  async getViewUrl(req: any, res: any, next: any) {
    try {
      const { key } = req.query;
      if (!key || typeof key !== 'string' || !key.startsWith('teams/')) {
        return res.status(400).json({ status: 'ERROR', message: 'Geçerli bir key zorunludur.' });
      }
      const viewUrl = await getPresignedDownloadUrl(key, 300);
      return res.status(200).json({ status: 'OK', data: { viewUrl, expiresIn: 300 } });
    } catch (error) { next(error); }
  }

  // POST /uploads/analyze-receipt
  // Body: { key: string } — S3 key ile fatura OCR analizi
  async analyzeReceipt(req: any, res: any, next: any) {
    try {
      const { key } = req.body;
      if (!key || typeof key !== 'string') {
        return res.status(400).json({ status: 'ERROR', message: 'key zorunludur.' });
      }
      const result = await uploadService.analyzeReceipt(key);
      return res.status(200).json({ status: 'OK', data: result });
    } catch (error) { next(error); }
  }
}

module.exports = new UploadController();
export {};
