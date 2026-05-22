// Thin re-export — delegates to structured web_sockets/socket.server.ts.
// server.ts continues to import { initWebSocketServer } from here unchanged.
const socketServer = require('../web_sockets/socket.server');

module.exports = socketServer;
export {};
