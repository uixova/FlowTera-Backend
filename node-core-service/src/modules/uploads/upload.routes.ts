const { Router }        = require('express');
const { authenticate }  = require('../../middlewares/authenticate');
const uploadController  = require('./upload.controller');
const multer            = require('multer');

const router = Router();

// Multer with memory storage — file bytes held in buffer, not written to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Desteklenmeyen dosya türü. İzin verilenler: jpg, png, webp, pdf'));
    }
  },
});

// Presigned PUT URL al — yükleme için; response'da key döner, DB'ye key yazılır
router.get('/presigned',        authenticate, uploadController.getPresignedUrl.bind(uploadController));

// Kullanıcı avatar ve takım görseli presigned upload URL
router.get('/presigned-avatar',     authenticate, uploadController.getAvatarPresignedUrl.bind(uploadController));
router.get('/presigned-team-image', authenticate, uploadController.getTeamImagePresignedUrl.bind(uploadController));

// Presigned GET URL al — özel bucket dosyasına geçici erişim için
router.get('/view',             authenticate, uploadController.getViewUrl.bind(uploadController));

// Fatura analizi — S3 key ile OCR
router.post('/analyze-receipt', authenticate, uploadController.analyzeReceipt.bind(uploadController));

// Fatura analizi — doğrudan dosya yükleme (S3 olmadan, multipart/form-data)
router.post('/ocr-direct', authenticate, upload.single('file'), uploadController.analyzeReceiptDirect.bind(uploadController));

module.exports = router;
export {};
