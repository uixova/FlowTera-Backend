const { Router }       = require('express');
const teamController   = require('./team.controller');
const memberController = require('./member.controller');
const { authenticate } = require('../../middlewares/authenticate');
const { teamGuard }    = require('../../middlewares/teamGuard');
const { adminGuard }   = require('../../middlewares/adminGuard');

const router = Router();

// Kendi takımlarını getir / yeni takım oluştur
router.get('/',  authenticate, teamController.getMyTeams);
router.post('/', authenticate, teamController.createTeam);

// Takım işlemleri — :teamId kullanılır (teamGuard req.params.teamId okur)
router.put('/:teamId',    authenticate, teamGuard, adminGuard, teamController.updateTeam);
router.delete('/:teamId', authenticate, teamGuard, adminGuard, teamController.deleteTeam);

// Takım detay / ayarlar
router.get('/:teamId/members',    authenticate, teamGuard, teamController.getMembers);
router.get('/:teamId/settings',   authenticate, teamGuard, teamController.getTeamSettings);
router.patch('/:teamId/settings', authenticate, teamGuard, adminGuard, teamController.updateTeamSettings);

// Üye işlemleri
router.post('/:teamId/members',           authenticate, teamGuard, adminGuard, memberController.addMember);
router.put('/:teamId/members/:userId',    authenticate, teamGuard, adminGuard, memberController.updateMember);
router.delete('/:teamId/members/:userId', authenticate, teamGuard, adminGuard, memberController.removeMember);

module.exports = router;
export {};
