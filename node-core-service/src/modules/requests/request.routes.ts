const { Router }          = require('express');
const requestController   = require('./request.controller');
const { authenticate }    = require('../../middlewares/authenticate');

const router = Router();

router.get('/',                authenticate, requestController.getTeamRequests);
router.get('/:id',             authenticate, requestController.getRequestById);
router.post('/',               authenticate, requestController.createRequest);
router.patch('/:id/respond',   authenticate, requestController.respondToRequest);
router.delete('/:id',          authenticate, requestController.cancelRequest);

module.exports = router;
export {};
