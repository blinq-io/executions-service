// src/classes/ExecutionRunner.ts
import { Execution, Task } from '../models/execution.model';
import { ExecutionPodAgent } from './ExecutionPodAgent';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { KubernetesClient } from './KubernetesClient';

import { BACKEND_SOCKET_URL } from '../constants';
import { generateWorkerYaml } from '../jobs/generateWorkerYaml';
import { getActiveGroupIndex, getFlowGroupKey, getTasksArray } from '../utils/execData';

export class ExecutionRunner {
  private io: SocketIOServer;
  private execution: Execution;
  private flowTaskQueues: Map<string, Task[]> = new Map();
  private connectedAgents: Map<string, ExecutionPodAgent> = new Map();

  constructor(execution: Execution, io: SocketIOServer) {
    this.execution = execution;
    this.io = io;
    this.initializeQueues();
  }

  private initializeQueues() {
    this.execution.flows.forEach((flow, index) => {
      flow.scenarioGroups.forEach((group, groupIndex) => {
        const flowGroupKey = getFlowGroupKey(this.execution._id, index, groupIndex);
        this.flowTaskQueues.set(flowGroupKey, getTasksArray(group.scenarios, index, groupIndex));
        console.log('🗂️ Initialized task queue for', flowGroupKey, group.scenarios);
      });
    });
  }

  public async start() {
    console.log(`🚀 Execution ${this.execution.name} starting...`);
    await this.spawnPods();
    this.setupSocketServer();
  }
  // ✅ Works
  private async spawnPods() {
    const k8sClient = new KubernetesClient();
    const pvcName = `pvc-${this.execution._id}`;
    const setupPodName = `setup-${this.execution._id}`;
    const EXTRACT_DIR = process.env.EXTRACT_DIR!;
    const BLINQ_TOKEN = process.env.BLINQ_TOKEN!;
    const EXECUTION_ID = this.execution._id; 

    await k8sClient.applyManifestFromFile('src/jobs/pvc.yaml', {
      EXECUTION_ID,
    });
    let skipSetup = true;
    if(!skipSetup) {
      await k8sClient.applyManifestFromFile('src/jobs/setupEnv.yaml', {
        EXECUTION_ID,
        EXTRACT_DIR,
        BLINQ_TOKEN,
        BUILD_ID: String(new Date().getTime()),
      });
  
      console.log('🚀 Setup pod launched:', setupPodName); 
  
      console.log(`⏳ Waiting for setup pod ${setupPodName} to complete...`);
      await k8sClient.waitForPodCompletion(setupPodName);
  
      // 3. (Optional) delete setup pod after success
      await k8sClient.deletePod(setupPodName);
      console.log(`🗑️ Setup pod ${setupPodName} deleted`);
    } else {
      console.log(`⚠️ Skipping setup pod for ${setupPodName}`);
    }

    this.execution.flows.forEach((flow, flowIndex) => {
      const activeGroupIndex = getActiveGroupIndex(flowIndex);
      const group = flow.scenarioGroups[activeGroupIndex]; 
      const flowGroupKey = getFlowGroupKey(this.execution._id, flowIndex, activeGroupIndex);
      console.log(`⬆︎ Launching pods for ${flowGroupKey}`);
      for (let i = 0; i < group.threadCount; i++) {
        const podId = `${flowGroupKey}.w${i}`;
        const podSpec = generateWorkerYaml({
          EXECUTION_ID,
          EXTRACT_DIR,
          POD_ID: podId,
          FLOW_GROUP_KEY: flowGroupKey,
          BLINQ_TOKEN,
          SOCKET_URL: BACKEND_SOCKET_URL,
        });
        console.log(`🚀 Launching pod ${podId}`);
        k8sClient.createPodFromYaml(podSpec);
      }
    });
  }

  public setupSocketServer() {
    this.io.on('connection', (socket: Socket) => {
      socket.emit("hello", "world");
      const podId = socket.handshake.query.podId as string;
      const flowGroupKey = socket.handshake.query.flowGroupKey as string;
      const executionId = socket.handshake.query.executionId as string;

      if(executionId !== this.execution._id.toString()) {
        console.warn(`❌ Pod ${podId} connected to wrong execution ${executionId}`);
        socket.disconnect();
        return;
      }

      if (!podId || !flowGroupKey) {
        console.warn(`❌ Pod connected without required identifiers`);
        socket.disconnect();
        return;
      }

      console.log(`🔌 Pod ${podId} connected for tasks in ${flowGroupKey}`);
      const agent = new ExecutionPodAgent(podId, socket);
      this.connectedAgents.set(podId, agent);

      socket.on('ready', (e: any) => {
        console.log('🔥 Recieved', e)
        const taskQueue = this.flowTaskQueues.get(flowGroupKey);
        if (!taskQueue || taskQueue.length === 0) {
          console.log(`📭 No tasks left for ${flowGroupKey}`);
          return;
        }

        const task = taskQueue.shift();
        agent.assignTask(task);
      });

 
      socket.on('connect_error', (err) => {
        console.error('❌ Socket connection error:', err.message);
      });
      
      socket.on('disconnect', (reason) => {
        console.warn('⚠️ Socket disconnected:', reason);
        console.warn(`❌ Pod ${podId} disconnected`);
        this.connectedAgents.delete(podId);
      });
    });
  }
}
