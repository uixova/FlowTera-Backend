const { Router }        = require('express');
const requestController = require('./request.controller');
const { authenticate }  = require('../../middlewares/authenticate');
const { teamGuard }     = require('../../middlewares/teamGuard');
const { adminGuard }    = require('../../middlewares/adminGuard');

const router = Router();

// teamId zorunlu (req.query.teamId)
router.get('/',              authenticate, teamGuard, requestController.getTeamRequests);
// ID bazlı — servis kendi doğrulamasını yapar
router.get('/:id',           authenticate, requestController.getRequestById);
// teamId body'de gelir (req.body.teamId)
router.post('/',             authenticate, teamGuard, requestController.createRequest);
// Yanıtlama — teamId query'de, sadece Admin yapabilir
router.patch('/:id/respond', authenticate, teamGuard, adminGuard, requestController.respondToRequest);
// İptal — servis senderId doğrulaması yapar
router.delete('/:id',        authenticate, requestController.cancelRequest);

module.exports = router;
export {};
