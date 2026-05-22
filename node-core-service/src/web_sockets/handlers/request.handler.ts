const { S }                 = require('../socket.events');
const { sendTo,
        emitToTeam,
        emitToTeamAdmin,
        emitToUser }        = require('../socket.rooms');

/**
 * Request events (Client → Server).
 *
 * request:new     → create request → notify team admins (team:{teamId}:admin room)
 * request:respond → approve/reject → notify whole team + sender personally
 * request:leave   → auto-create leave request → notify admins
 */

const onNew = async (
  ws:      any,
  payload: any,
  userId:  string,
  teamId:  string,
): Promise<void> => {
  const requestService = require('../../modules/requests/request.service');

  const req = await requestService.createRequest({ ...payload, senderId: userId, teamId });

  // Admins see new request instantly (team:{teamId}:admin)
  emitToTeamAdmin(teamId, S.REQUEST_UPDATE, { action: 'new', request: req });

  // Ack to sender
  sendTo(ws, S.REQUEST_SENT, { id: req.id });
};

const onRespond = async (
  _ws:     any,
  payload: { id: string; action: 'approved' | 'rejected'; teamId?: string; rejectionReason?: string },
  _userId: string,
  teamId:  string,
): Promise<void> => {
  const requestService = require('../../modules/requests/request.service');

  const targetTeam = payload.teamId || teamId;
  const updated    = await requestService.respondToRequest(
    payload.id,
    payload.action,
    targetTeam,
    payload.rejectionReason,
  );

  // All team members see updated request status (team:{teamId}:requests)
  emitToTeam(targetTeam, S.REQUEST_UPDATE, { action: 'responded', request: updated });

  // Sender gets personal notification (user:{senderId})
  if (updated.senderId) {
    const verb = payload.action === 'approved' ? 'onaylandı' : 'reddedildi';
    emitToUser(updated.senderId, S.NOTIFICATION_NEW, {
      type:   'info',
      text:   `Talebiniz "${updated.title}" ${verb}.`,
      date:   new Date().toISOString(),
      teamId: updated.teamId,
    });
  }
};

const onLeave = async (
  ws:      any,
  payload: { teamId?: string },
  userId:  string,
  teamId:  string,
): Promise<void> => {
  const requestService = require('../../modules/requests/request.service');

  const targetTeam = payload.teamId || teamId;
  const req = await requestService.createRequest({
    type:     'request',
    category: 'team',
    title:    'Takımdan Ayrılma İsteği',
    text:     'Kullanıcı takımdan ayrılmak istiyor.',
    senderId: userId,
    teamId:   targetTeam,
    path:     '/team',
    status:   'pending',
  });

  // Only admins need to see leave requests
  emitToTeamAdmin(targetTeam, S.REQUEST_UPDATE, { action: 'new', request: req });
  sendTo(ws, S.REQUEST_SENT, { id: req.id });
};

module.exports = { onNew, onRespond, onLeave };
export {};
