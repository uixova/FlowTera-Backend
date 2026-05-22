// Server → Client events
const S = {
  CONNECTION:            'connection',
  ERROR:                 'error',

  // Notifications
  NOTIFICATION_NEW:      'notification:new',
  NOTIFICATION_DELETED:  'notification:deleted',
  NOTIFICATION_CLEARED:  'notification:cleared',

  // Requests
  REQUEST_UPDATE:        'request:update',
  REQUEST_SENT:          'request:sent',

  // Presence
  PRESENCE_ONLINE:       'presence:online',
  PRESENCE_OFFLINE:      'presence:offline',
} as const;

// Client → Server events
const C = {
  NOTIFICATION_DELETE:      'notification:delete',
  NOTIFICATION_CLEAR_INFOS: 'notification:clear_infos',
  REQUEST_NEW:              'request:new',
  REQUEST_RESPOND:          'request:respond',
  REQUEST_LEAVE:            'request:leave',
  PRESENCE_PING:            'presence:ping',
} as const;

module.exports = { S, C };
export {};
