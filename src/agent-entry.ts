import { io } from 'socket.io-client';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Task, TaskResult } from './models/execution.model';

const extractDir = process.env.EXTRACT_DIR;
const podId = process.env.POD_ID;
const socketUrl = process.env.SOCKET_URL;

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
const runsPath = path.join(projectPath, 'runs');  //! TODO: work on reports and global_test_data logic
fs.mkdirSync(runsPath, { recursive: true });

console.log(`🔌 Connecting to socket: ${socketUrl}`);
const socket = io(socketUrl, {
  query: {
    podId,
  },
  transports: ['websocket'],
});

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
  try {
    await new Promise((resolve) => socket.once('disconnect', resolve));
    console.log(`✅ Disconnected cleanly`);
  } catch (err) {
    console.error(`❌ Error during disconnect`, err);
  }
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
  process.exit(1);
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
