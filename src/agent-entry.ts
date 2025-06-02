import { io } from 'socket.io-client';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Task, TaskResult } from './models/execution.model';
import { BACKEND_SOCKET_URL } from './constants';

const extractDir = process.env.EXTRACT_DIR;
const podId = process.env.POD_ID;

// const socketUrl = 'http://host.docker.internal:5003'; // for local dev and testing
const socketUrl = process.env.BACKEND_SOCKET_URL;
if(!socketUrl) {
  console.error('❌ BACKEND_SOCKET_URL environment variable is not set.');
  process.exit(1);
}
console.log(`🔌 Connecting to socket: ${socketUrl}`);
const socket = io(socketUrl, {
  path: '/api/executions/ws',
  query: { podId },
  transports: ['websocket'],
});

if (!extractDir || !podId) {
  console.error('❌ Missing required environment variables', {
    extractDir,
    podId,
  });
  socket.emit('cleanup', podId);
}

const projectPath = path.join('/app/shared/project-dir', extractDir!);
const runsPath = path.join(projectPath, 'runs');  //! TODO: work on reports and global_test_data logic
fs.mkdirSync(runsPath, { recursive: true });



socket.on('task', (task: Task) => {
  console.log(`📦 Received task ${task.id}`);
  const runDir = path.join(runsPath, `${task.id}`);
  fs.mkdirSync(runDir, { recursive: true });

  const child = exec(task.data.command, { cwd: projectPath });

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
    const taskResult: TaskResult = { taskId: task.id, exitCode: code, task };
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
