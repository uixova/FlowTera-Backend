const { S }          = require('../socket.events');
const { sendTo }     = require('../socket.rooms');

/**
 * Notification events (Client → Server).
 *
 * notification:delete      → delete single notification, ack to sender
 * notification:clear_infos → delete all info notifications for user, ack to sender
 */

const onDelete = async (
  ws:      any,
  payload: { id: string },
  userId:  string,
): Promise<void> => {
  const notificationService = require('../../modules/notifications/notification.service');
  await notificationService.deleteNotification(payload.id, userId);
  sendTo(ws, S.NOTIFICATION_DELETED, { id: payload.id });
};

const onClearInfos = async (
  ws:     any,
  userId: string,
): Promise<void> => {
  const notificationService = require('../../modules/notifications/notification.service');
  await notificationService.clearUserInfos(userId);
  sendTo(ws, S.NOTIFICATION_CLEARED, { userId });
};

module.exports = { onDelete, onClearInfos };
export {};
