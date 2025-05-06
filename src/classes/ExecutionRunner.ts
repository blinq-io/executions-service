// src/classes/ExecutionRunner.ts
import { Execution } from '../models/execution.model';
import { ExecutionPodAgent } from './ExecutionPodAgent';
import { Server as SocketIOServer, Socket } from 'socket.io';

export class ExecutionRunner {
  private io: SocketIOServer;
  private execution: Execution;
  private flowTaskQueues: Map<string, any[]> = new Map();
  private connectedAgents: Map<string, ExecutionPodAgent> = new Map();

  constructor(execution: Execution, io: SocketIOServer) {
    this.execution = execution;
    this.io = io;
    this.initializeQueues();
  }

  private initializeQueues() {
    this.execution.flows.forEach((flow, index) => {
      flow.scenarioGroups.forEach((group, groupIndex) => {
        const flowGroupKey = `${this.execution.name}:flow${index}:sg${groupIndex}`;
        this.flowTaskQueues.set(flowGroupKey, group.scenarios);
        console.log('🗂️ Initialized task queue for', flowGroupKey, group.scenarios);
      });
    });
  }

  public async start() {
    console.log(`🚀 Execution ${this.execution.name} starting...`);
    await this.spawnPods();
    this.setupSocketServer();
  }

  private async spawnPods() {
    // Placeholder for K8s pod launch logic
    // We'll use the threadCount per scenario group to decide how many agents (pods) to launch
    console.log('🛠️ Spawning K8s pods...');
  }

  public setupSocketServer() {
    this.io.on('connection', (socket: Socket) => {
      const podId = socket.handshake.query.podId as string;
      const flowKey = socket.handshake.query.flowKey as string;

      if (!podId || !flowKey) {
        console.warn(`❌ Pod connected without required identifiers`);
        socket.disconnect();
        return;
      }

      console.log(`🔌 Pod ${podId} connected for ${flowKey}`);
      const agent = new ExecutionPodAgent(podId, socket);
      this.connectedAgents.set(podId, agent);

      socket.on('ready', () => {
        const taskQueue = this.flowTaskQueues.get(flowKey);
        if (!taskQueue || taskQueue.length === 0) {
          console.log(`📭 No tasks left for ${flowKey}`);
          return;
        }

        const task = taskQueue.shift();
        agent.assignTask(task);
      });

      socket.on('task-complete', (result) => {
        console.log(`✅ Pod ${podId} completed:`, result);
        // (optional) push another task if available
      });

      socket.on('disconnect', () => {
        console.warn(`❌ Pod ${podId} disconnected`);
        this.connectedAgents.delete(podId);
        // (optional) requeue in-flight task
      });
    });
  }
}
