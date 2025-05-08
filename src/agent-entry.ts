import { io } from 'socket.io-client';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const executionId = process.env.EXECUTION_ID;
const extractDir = process.env.EXTRACT_DIR;
const podId = process.env.POD_ID;
const flowGroupKey = process.env.FLOW_GROUP_KEY;
const socketUrl = process.env.SOCKET_URL;

if (!executionId || !extractDir || !podId || !flowGroupKey || !socketUrl) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const projectPath = path.join('/app/shared/project-dir', extractDir);
const runsPath = path.join(projectPath, 'runs');
fs.mkdirSync(runsPath, { recursive: true });

console.log(`🔌 Connecting to socket: ${socketUrl}`);
const socket = io(socketUrl, {
  query: {
    executionId,
    podId,
    flowGroupKey,
  },
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log(`✅ Connected as ${podId}`);
  socket.emit('ready-for-task', { podId, flowGroupKey });
});

socket.on('execute-task', (task: { id: string; command: string }) => {
  console.log(`📦 Received task ${task.id}`);
  const runDir = path.join(runsPath, `${task.id}`);
  fs.mkdirSync(runDir, { recursive: true });

  const child = exec(task.command, { cwd: projectPath });

  child.stdout?.on('data', (data) => {
    process.stdout.write(data);
    socket.emit('task-log', { taskId: task.id, type: 'stdout', data });
  });

  child.stderr?.on('data', (data) => {
    process.stderr.write(data);
    socket.emit('task-log', { taskId: task.id, type: 'stderr', data });
  });

  child.on('close', (code) => {
    console.log(`✅ Task ${task.id} completed with code ${code}`);
    socket.emit('task-complete', { taskId: task.id, exitCode: code });
    socket.emit('ready-for-task', { podId, flowGroupKey });
  });
});
