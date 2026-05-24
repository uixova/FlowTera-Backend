const { Router }        = require('express');
const { authenticate }  = require('../../middlewares/authenticate');
const uploadController  = require('./upload.controller');

const router = Router();

// Presigned PUT URL al — yükleme için; response'da key döner, DB'ye key yazılır
router.get('/presigned',        authenticate, uploadController.getPresignedUrl.bind(uploadController));

// Kullanıcı avatar ve takım görseli presigned upload URL
router.get('/presigned-avatar',     authenticate, uploadController.getAvatarPresignedUrl.bind(uploadController));
router.get('/presigned-team-image', authenticate, uploadController.getTeamImagePresignedUrl.bind(uploadController));

// Presigned GET URL al — özel bucket dosyasına geçici erişim için
router.get('/view',             authenticate, uploadController.getViewUrl.bind(uploadController));

// Fatura analizi — S3 key ile OCR
router.post('/analyze-receipt', authenticate, uploadController.analyzeReceipt.bind(uploadController));

module.exports = router;
export {};
