const { Router }       = require('express');
const tripController   = require('./trip.controller');
const { authenticate } = require('../../middlewares/authenticate');

const router = Router();

router.get('/',              authenticate, tripController.getTripsByTeam);
router.get('/:id',          authenticate, tripController.getTripById);
router.post('/',            authenticate, tripController.createTrip);
router.put('/:id',          authenticate, tripController.updateTrip);
router.patch('/:id/status', authenticate, tripController.updateTripStatus);
router.delete('/:id',       authenticate, tripController.deleteTrip);

module.exports = router;
export {};
