"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const execution_routes_1 = __importDefault(require("./routes/execution.routes"));
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const sockets_1 = require("./sockets");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*', //! update this when deploying
    }
});
exports.io = io;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/executions', execution_routes_1.default);
//? bind on all interfaces
httpServer.listen(5000, '0.0.0.0', () => console.log('🚀 HTTP Server running on port 5000'));
(0, sockets_1.setupGlobalSocketHandlers)(io);
exports.default = app;
