const { Router }              = require('express');
const subscriptionController  = require('./subscription.controller');
const { authenticate }        = require('../../middlewares/authenticate');

const router = Router();

// Mevcut tüm planları listele (auth gerektirmez — marketing sayfaları için)
router.get('/plans',             subscriptionController.getAvailablePlans);

// Kullanıcı abonelik işlemleri
router.get('/user/:userId',      authenticate, subscriptionController.getUserSubscription);
router.patch('/user/:userId',    authenticate, subscriptionController.upgradePlan);
router.delete('/user/:userId',   authenticate, subscriptionController.cancelSubscription);

module.exports = router;
export {};
