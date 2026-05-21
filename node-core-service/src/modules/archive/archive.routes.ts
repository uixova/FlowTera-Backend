const { Router }         = require('express');
const archiveController  = require('./archive.controller');
const { authenticate }   = require('../../middlewares/authenticate');

const router = Router();

router.get('/', authenticate, archiveController.getArchiveData);

module.exports = router;
export {};
