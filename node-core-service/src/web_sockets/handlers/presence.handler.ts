const { S }               = require('../socket.events');
const { emitToTeam,
        sendTo,
        getOnlineUsers }  = require('../socket.rooms');

/**
 * Handle presence events.
 *
 * On connect  → broadcast online status to team.
 * On disconnect → broadcast offline status to team.
 * On ping     → pong back (keep-alive check).
 */

const onConnected = (ws: any, userId: string, teamId: string): void => {
  emitToTeam(teamId, S.PRESENCE_ONLINE, {
    userId,
    teamId,
    onlineUsers: getOnlineUsers(teamId),
  });
};

const onDisconnected = (userId: string, teamId: string): void => {
  emitToTeam(teamId, S.PRESENCE_OFFLINE, {
    userId,
    teamId,
    onlineUsers: getOnlineUsers(teamId),
  });
};

const onPing = (ws: any, _payload: any): void => {
  sendTo(ws, 'presence:pong', { ts: Date.now() });
};

module.exports = { onConnected, onDisconnected, onPing };
export {};
