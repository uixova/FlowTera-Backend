const { Router }       = require('express');
const userController   = require('./user.controller');
const { authenticate } = require('../../middlewares/authenticate');

const router = Router();

router.get('/', userController.listAll);
router.get('/:id', authenticate, userController.getProfile);
router.put('/:id', authenticate, userController.updateProfile);
router.patch('/:id/settings', authenticate, userController.updateSettings);
router.patch('/:id/password', authenticate, userController.changePassword);
router.delete('/:id', authenticate, userController.deleteAccount);

module.exports = router;
export {};
