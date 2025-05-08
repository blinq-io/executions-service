import { io } from 'socket.io-client';

const execName = 'E2'
const flowName = 'flow1';
const scenarioGroupName = 'sg0';

const podId = `pod-${Math.floor(Math.random() * 10000)}`;
const flowKey = execName + ':' + flowName + ':' + scenarioGroupName;

console.log('🚀 Starting agent simulator...', JSON.stringify({ flowKey, podId }, null, 2));

const socket = io('http://localhost:5000', {
    query: {
        podId,
        flowKey
    }
});

socket.on('connect', () => {
    console.log(`✅ ${podId} connected to server.`);
    socket.emit('ready');
});

socket.on('task', (task) => {
    console.log(`📥 ${podId} received task:`, task);

    // Simulate task processing`
    setTimeout(() => {
        console.log(`✅ ${podId} completed task.`);
        socket.emit('task-complete', { podId, taskId: task.id });
        socket.emit('ready'); // Ask for the next task
    }, 2000);
});

socket.on('disconnect', () => {
    console.log(`❌ ${podId} disconnected`);
});
