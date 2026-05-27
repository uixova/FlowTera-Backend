const { Router }       = require('express');
const tripController   = require('./trip.controller');
const { authenticate } = require('../../middlewares/authenticate');
const { teamGuard }    = require('../../middlewares/teamGuard');
const { adminGuard }   = require('../../middlewares/adminGuard');
const { rbac }         = require('../../middlewares/rbac');
const { validate }     = require('../../middlewares/validate');
const {
  createTripSchema,
  updateTripSchema,
  updateTripStatusSchema,
} = require('./trip.validators');

const router = Router();

router.get('/',              authenticate, teamGuard, tripController.getTripsByTeam);
router.get('/:id',          authenticate, tripController.getTripById);
// trip_create deny-list: üye bu izni engellenmişse gezi oluşturamaz
router.post('/',            authenticate, teamGuard, rbac('trip_create'), validate(createTripSchema), tripController.createTrip);
router.put('/:id',          authenticate, validate(updateTripSchema), tripController.updateTrip);
router.patch('/:id/status', authenticate, teamGuard, adminGuard, validate(updateTripStatusSchema), tripController.updateTripStatus);
router.delete('/:id',       authenticate, tripController.deleteTrip);

module.exports = router;
export {};
