// Room Entry 
export interface RoomEntry {
  ws:     any;
  userId: string;
  role:   string;
}

// Room Registry 
// user:{userId}       → personal channel (team-agnostic: invites, profile)
const userRoom = new Map<string, any>(); // userId → ws

// team:{teamId}       → all team members
// team:{teamId}:admin → Admin-role members only (filtered from teamRoom)
const teamRoom = new Map<string, Set<RoomEntry>>(); // teamId → Set<entry>

// Registration 
const joinRooms = (ws: any, userId: string, teamId: string, role: string): void => {
  // Close stale connection for same user
  const existing = userRoom.get(userId);
  if (existing && existing !== ws) existing.close(1000, 'New connection opened.');

  userRoom.set(userId, ws);

  if (!teamRoom.has(teamId)) teamRoom.set(teamId, new Set());
  teamRoom.get(teamId)!.add({ ws, userId, role });

  ws.once('close', () => leaveRooms(ws, userId, teamId));
};

const leaveRooms = (ws: any, userId: string, teamId: string): void => {
  userRoom.delete(userId);

  const entries = teamRoom.get(teamId);
  if (entries) {
    for (const entry of entries) {
      if (entry.ws === ws) { entries.delete(entry); break; }
    }
    if (entries.size === 0) teamRoom.delete(teamId);
  }
};

// Emit Helpers
const safeStringify = (data: any): string => {
  try { return JSON.stringify(data); } catch { return '{}'; }
};

const sendTo = (ws: any, type: string, payload: any): void => {
  if (ws?.readyState === 1) ws.send(safeStringify({ type, payload }));
};

// user:{userId} — personal, team-agnostic
const emitToUser = (userId: string, type: string, payload: any): void => {
  const ws = userRoom.get(userId);
  if (ws) sendTo(ws, type, payload);
};

// team:{teamId} — all connected team members
const emitToTeam = (teamId: string, type: string, payload: any): void => {
  teamRoom.get(teamId)?.forEach(entry => sendTo(entry.ws, type, payload));
};

// team:{teamId}:admin — Admin-role members only
const emitToTeamAdmin = (teamId: string, type: string, payload: any): void => {
  teamRoom.get(teamId)?.forEach(entry => {
    if (entry.role === 'Admin') sendTo(entry.ws, type, payload);
  });
};

// team:{teamId}:requests — same broadcast as emitToTeam (all members see request updates)
const emitToTeamRequests = emitToTeam;

const getRoomSize = (teamId: string): number =>
  teamRoom.get(teamId)?.size ?? 0;

const getOnlineUsers = (teamId: string): string[] => {
  const entries = teamRoom.get(teamId);
  if (!entries) return [];
  return Array.from(entries).map(e => e.userId);
};

module.exports = {
  joinRooms,
  leaveRooms,
  sendTo,
  emitToUser,
  emitToTeam,
  emitToTeamAdmin,
  emitToTeamRequests,
  getRoomSize,
  getOnlineUsers,
};
export {};
