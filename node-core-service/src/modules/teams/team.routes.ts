const { Router }       = require('express');
const teamController   = require('./team.controller');
const memberController = require('./member.controller');
const { authenticate } = require('../../middlewares/authenticate');

const router = Router();

// Takım CRUD
router.get('/',                authenticate, teamController.getMyTeams);
router.post('/',               authenticate, teamController.createTeam);
router.put('/:id',             authenticate, teamController.updateTeam);
router.delete('/:id',          authenticate, teamController.deleteTeam);

// Takım detay / ayarlar
router.get('/:id/members',    authenticate, teamController.getMembers);
router.get('/:id/settings',   authenticate, teamController.getTeamSettings);
router.patch('/:id/settings', authenticate, teamController.updateTeamSettings);

// Üye işlemleri
router.post('/:teamId/members',              authenticate, memberController.addMember);
router.put('/:teamId/members/:userId',       authenticate, memberController.updateMember);
router.delete('/:teamId/members/:userId',    authenticate, memberController.removeMember);

module.exports = router;
export {};
