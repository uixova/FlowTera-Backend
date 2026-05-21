const { Router }              = require('express');
const notificationController  = require('./notification.controller');
const { authenticate }        = require('../../middlewares/authenticate');

const router = Router();

router.get('/',                authenticate, notificationController.getNotifications);
router.post('/',               authenticate, notificationController.createInfo);
router.delete('/clear-infos',  authenticate, notificationController.clearInfos);
router.delete('/:id',          authenticate, notificationController.deleteNotification);

module.exports = router;
export {};
