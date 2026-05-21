const { Router }       = require('express');
const authController   = require('./auth.controller');
const resetController  = require('./reset.controller');

const router = Router();

// Kimlik doğrulama
router.post('/login',  authController.login);
router.post('/verify', authController.verify);
router.post('/signup', authController.signup);

// Şifre sıfırlama akışı
router.post('/forgot-password',           resetController.forgotPassword);
router.get('/reset-password/validate',    resetController.validateResetToken);
router.post('/reset-password',            resetController.resetPassword);

module.exports = router;
export {};
