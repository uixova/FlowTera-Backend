const { Router }         = require('express');
const archiveController  = require('./archive.controller');
const { authenticate }   = require('../../middlewares/authenticate');
const { teamGuard }      = require('../../middlewares/teamGuard');
const { rbac }           = require('../../middlewares/rbac');

const router = Router();

// teamId zorunlu (req.query.teamId) — view_archive deny-list kontrolü
router.get('/', authenticate, teamGuard, rbac('view_archive'), archiveController.getArchiveData);

module.exports = router;
export {};
