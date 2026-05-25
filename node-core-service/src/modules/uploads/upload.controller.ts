const uploadService      = require('./upload.service');
const subscriptionService = require('../subscriptions/subscription.service');
const { getPresignedDownloadUrl, getAvatarUploadUrl, getTeamImageUploadUrl } = require('../../utils/s3');

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

  // GET /uploads/presigned-avatar?ext=png&userId=xxx
  async getAvatarPresignedUrl(req: any, res: any, next: any) {
    try {
      const { ext } = req.query;
      const userId  = req.user?.userId;
      if (!ext || !userId) return res.status(400).json({ status: 'ERROR', message: 'ext zorunludur.' });
      const allowed = ['jpg', 'jpeg', 'png', 'webp'];
      if (!allowed.includes((ext as string).toLowerCase()))
        return res.status(400).json({ status: 'ERROR', message: 'Yalnızca jpg/png/webp.' });
      const result = await getAvatarUploadUrl(userId, ext as string);
      return res.status(200).json({ status: 'OK', data: result });
    } catch (error) { next(error); }
  }

  // GET /uploads/presigned-team-image?ext=png&teamId=xxx
  async getTeamImagePresignedUrl(req: any, res: any, next: any) {
    try {
      const { ext, teamId } = req.query;
      if (!ext || !teamId) return res.status(400).json({ status: 'ERROR', message: 'ext ve teamId zorunludur.' });
      const allowed = ['jpg', 'jpeg', 'png', 'webp'];
      if (!allowed.includes((ext as string).toLowerCase()))
        return res.status(400).json({ status: 'ERROR', message: 'Yalnızca jpg/png/webp.' });
      const result = await getTeamImageUploadUrl(teamId as string, ext as string);
      return res.status(200).json({ status: 'OK', data: result });
    } catch (error) { next(error); }
  }

  // POST /uploads/analyze-receipt — OCR analysis via Python ML service
  // Body: { key: string } — S3 key of the uploaded receipt image
  async analyzeReceipt(req: any, res: any, next: any) {
    try {
      const { key } = req.body;
      if (!key || typeof key !== 'string') {
        return res.status(400).json({ status: 'ERROR', message: 'key zorunludur.' });
      }

      const result = await uploadService.analyzeReceipt(key);

      // Increment OCR usage counter in the user's subscription (fire-and-forget)
      const userId = req.user?.userId;
      if (userId) {
        subscriptionService.incrementUsage(userId, 'ocr').catch(() => {});
      }

      return res.status(200).json({ status: 'OK', data: result });
    } catch (error) { next(error); }
  }

  // POST /uploads/ocr-direct — Direct file upload OCR (bypasses S3)
  // Multipart form-data: file field with the receipt image or PDF
  async analyzeReceiptDirect(req: any, res: any, next: any) {
    try {
      if (!req.file) {
        return res.status(400).json({ status: 'ERROR', message: 'Dosya zorunludur (multipart/form-data, alan adı: file).' });
      }

      const { buffer, originalname, mimetype } = req.file;
      const result = await uploadService.analyzeReceiptDirect(buffer, originalname, mimetype);

      // Increment OCR usage counter — same as analyzeReceipt (fire-and-forget)
      const userId = req.user?.userId;
      if (userId) {
        subscriptionService.incrementUsage(userId, 'ocr').catch(() => {});
      }

      return res.status(200).json({ status: 'OK', data: result });
    } catch (error) { next(error); }
  }
}

module.exports = new UploadController();
export {};
