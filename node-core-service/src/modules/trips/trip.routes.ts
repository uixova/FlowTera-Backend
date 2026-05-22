const { Router }       = require('express');
const tripController   = require('./trip.controller');
const { authenticate } = require('../../middlewares/authenticate');
const { teamGuard }    = require('../../middlewares/teamGuard');
const { adminGuard }   = require('../../middlewares/adminGuard');

const router = Router();

// teamId zorunlu (req.query.teamId)
router.get('/',              authenticate, teamGuard, tripController.getTripsByTeam);
// ID bazlı — servis katmanı sahipliği doğrular
router.get('/:id',          authenticate, tripController.getTripById);
// teamId body'de gelir (req.body.teamId)
router.post('/',            authenticate, teamGuard, tripController.createTrip);
router.put('/:id',          authenticate, tripController.updateTrip);
// Durum değişikliği — teamId body'de, sadece Admin yapabilir
router.patch('/:id/status', authenticate, teamGuard, adminGuard, tripController.updateTripStatus);
router.delete('/:id',       authenticate, tripController.deleteTrip);

module.exports = router;
export {};
