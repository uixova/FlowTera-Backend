const { Router }          = require('express');
const paymentController   = require('./payment.controller');
const { authenticate }    = require('../../middlewares/authenticate');

const router = Router();

// ─── Stripe Ödeme Akışı ──────────────────────────────────────────────────────
//
// 1. Frontend → POST /payments/create-intent { planId }
//    ↓ clientSecret döner
// 2. Frontend → stripe.confirmCardPayment(clientSecret, { payment_method: { card: cardElement } })
//    ↓ Stripe ödemeyi işler
// 3. Stripe → POST /payments/webhook (otomatik, stripe-signature ile)
//    ↓ Abonelik aktif edilir
//
// Simülasyon (geliştirme):
// 1. POST /payments/create-intent → { paymentIntentId, simulationMode: true }
// 2. POST /payments/simulate-success { paymentIntentId } → abonelik aktif

// Webhook — Stripe'dan geldiği için authenticate olmadan; stripe-signature doğrular
router.post('/webhook',         paymentController.handleWebhook);

// Kimlik doğrulama gerektiren endpointler
router.post('/create-intent',   authenticate, paymentController.createPaymentIntent);
router.post('/simulate-success', authenticate, paymentController.simulateSuccess);
router.get('/history/:userId',  authenticate, paymentController.getPaymentHistory);
router.post('/refund/:id',      authenticate, paymentController.refundPayment);

module.exports = router;
export {};
