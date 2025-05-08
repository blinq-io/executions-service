// src/classes/ExecutionRunner.ts
import { Execution } from '../models/execution.model';
import { ExecutionPodAgent } from './ExecutionPodAgent';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { KubernetesClient } from './KubernetesClient';

import { BACKEND_SOCKET_URL } from '../constants';
import { generateWorkerYaml } from '../jobs/generateWorkerYaml';

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
        const flowGroupKey = `${this.execution._id}:flow${index}:sg${groupIndex}`;
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
    const k8sClient = new KubernetesClient();
    const pvcName = `pvc-${this.execution._id}`;
    const setupPodName = `setup-${this.execution._id}`;
    const EXTRACT_DIR = process.env.EXTRACT_DIR!;
    const BLINQ_TOKEN = process.env.BLINQ_TOKEN!;
    const EXECUTION_ID = this.execution._id;

    // 1. Create PVC
    await k8sClient.applyManifestFromFile('src/jobs/pvc.yaml', {
      EXECUTION_ID,
    });

    // 2. Launch setup pod
    await k8sClient.applyManifestFromFile('src/jobs/setupEnv.yaml', {
      EXECUTION_ID,
      EXTRACT_DIR,
      BLINQ_TOKEN
    });

    console.log('🚀 Setup pod launched:', setupPodName);

    // Poll the setup pod status until it's done (you can add a helper here)
    console.log(`⏳ Waiting for setup pod ${setupPodName} to complete...`);
    await k8sClient.waitForPodCompletion(setupPodName);
    console.log(`✅ Setup pod ${setupPodName} completed successfully`);

    // 3. (Optional) delete setup pod after success
    await k8sClient.deletePod(setupPodName);
    console.log(`🗑️ Setup pod ${setupPodName} deleted`);

    // 4. Ready to launch worker pods or accept socket connections
    this.execution.flows.forEach((flow, flowIndex) => {
      flow.scenarioGroups.forEach((group, groupIndex) => {
        const flowGroupKey = `${this.execution._id}:flow${flowIndex}:sg${groupIndex}`;
        for (let i = 0; i < group.threadCount; i++) {
          const podId = `worker-${flowGroupKey}-${i}`;
          const podSpec = generateWorkerYaml({
            EXECUTION_ID,
            EXTRACT_DIR,
            POD_ID: podId,
            FLOW_GROUP_KEY: flowGroupKey,
            BLINQ_TOKEN,
            SOCKET_URL: BACKEND_SOCKET_URL,
          });

          k8sClient.createPodFromYaml(podSpec);
        }
      });
    });
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
