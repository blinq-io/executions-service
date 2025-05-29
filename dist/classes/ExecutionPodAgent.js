"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionPodAgent = void 0;
// src/classes/ExecutionPodAgent.ts
class ExecutionPodAgent {
    constructor(id, socket) {
        this.id = id;
        this.socket = socket;
        this.setupListeners();
    }
    setupListeners() {
        // this.socket.on('ready', () => {
        //   console.log(`✅ Pod ${this.id} is ready`);
        // TODO: Assign task to this pod
        // });
        this.socket.on('disconnect', () => {
            // Optional: Retry, mark pod failed, or requeue task
        });
        this.socket.on('task-log', (result) => {
            console.log(`📜 Pod ${this.id} log:`, JSON.stringify(result, null, 2));
            // (optional) push another task if available
        });
        this.socket.on('task-complete', (result) => {
            console.log(`✅ Pod ${this.id} completed:`, JSON.stringify(result, null, 2));
            // (optional) push another task if available
        });
    }
    assignTask(task) {
        console.log(`📝 Assigning task ${task.id} to pod ${this.id}`);
        this.socket.emit('task', task);
    }
}
exports.ExecutionPodAgent = ExecutionPodAgent;
