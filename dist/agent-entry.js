"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = require("socket.io-client");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const extractDir = process.env.EXTRACT_DIR;
const podId = process.env.POD_ID;
// const socketUrl = process.env.SOCKET_URL;
const socketUrl = 'ws://blinq-backend:5000';
// console.log('⚙️ ENV CHECK');
// console.log('EXTRACT_DIR:', extractDir);
// console.log('POD_ID:', podId);
// console.log('SOCKET_URL:', socketUrl);
//TODO
// 1. update ready logic on the server
// 2. remove extra envs from workerpod yaml and the server
// 3. update the on connection logic on server
if (!extractDir || !podId || !socketUrl) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
}
const projectPath = path.join('/app/shared/project-dir', extractDir);
const runsPath = path.join(projectPath, 'runs'); //! TODO: work on reports and global_test_data logic
fs.mkdirSync(runsPath, { recursive: true });
console.log(`🔌 Connecting to socket: ${socketUrl}`);
const socket = (0, socket_io_client_1.io)(socketUrl, {
    query: {
        podId,
    },
    transports: ['websocket'],
});
socket.on('task', (task) => {
    console.log(`📦 Received task ${task.id}`);
    const runDir = path.join(runsPath, `${task.id}`);
    fs.mkdirSync(runDir, { recursive: true });
    const child = (0, child_process_1.exec)(task.data.command, { cwd: projectPath });
    child.stdout?.on('data', (data) => {
        process.stdout.write(data);
        socket.emit('task-log', { taskId: task.id, type: 'stdout', data });
    });
    child.stderr?.on('data', (data) => {
        process.stderr.write(data);
        socket.emit('task-log', { taskId: task.id, type: 'stderr', data });
    });
    child.on('close', async (code) => {
        console.log(`✅ Task ${task.id} completed with code ${code}`);
        const taskResult = { taskId: task.id, exitCode: code, task };
        socket.emit('task-complete', taskResult);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        socket.emit('ready', { podId });
    });
});
socket.on('connect', () => {
    console.log(`✅ Connected as ${podId}`);
    setTimeout(() => {
        socket.emit('ready', { podId });
    }, 1000); // Give the event loop some time
});
socket.on('shutdown', async () => {
    console.log(`🛑 Shutdown signal received. Disconnecting...`);
    process.exit(0);
});
process.on('exit', (code) => {
    console.log(`👋 Process exited with code: ${code}`);
});
//? for testing
socket.on('hello', (msg) => {
    console.log('👋 Hello from server:', msg);
});
socket.emit('hello', 'world');
socket.on('disconnect', (reason) => {
    console.warn(`❌ Disconnected: ${reason}`);
});
socket.on('connect_error', (err) => {
    console.error('❌ Socket connection error:', err.message, err);
    process.exit(1);
});
socket.on('error', (err) => {
    console.error('❌ Socket error:', err.message);
    process.exit(1);
});
socket.on('reconnect_attempt', (attempt) => {
    console.warn(`🔄 Reconnecting... Attempt ${attempt}`);
    socket.emit('ready', { podId });
});
socket.on('reconnect', (attempt) => {
    console.log(`🔄 Reconnected on attempt ${attempt}`);
    socket.emit('ready', { podId });
});
