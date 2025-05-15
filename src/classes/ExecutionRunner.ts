// src/classes/ExecutionRunner.ts
import { Execution, Task } from '../models/execution.model';
import { ExecutionPodAgent } from './ExecutionPodAgent';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { KubernetesClient } from './KubernetesClient';

import { BACKEND_SOCKET_URL, PVC_YAML_PATH, SETUP_YAML_PATH } from '../constants';
import { generateWorkerYaml } from '../config_files/generateWorkerYaml';
import { getActiveGroupIndex, getFlowGroupKey, getTasksArray } from '../utils/execData';
import logger from '../utils/logger';

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
    this.execution.flows.forEach((flow, flowIndex) => {
      flow.scenarioGroups.forEach((group, groupIndex) => {
        const flowGroupKey = getFlowGroupKey(this.execution._id, flowIndex, groupIndex);
        this.flowTaskQueues.set(flowGroupKey, getTasksArray(group.scenarios, flowIndex, groupIndex));
        logger.info('🗂️ Initialized task queue for', flowGroupKey, group.scenarios);
      });
    });
  }

  public async start() {
    logger.info(`🚀 Execution ${this.execution.name} starting...`);
    await this.spawnPods();
    this.setupSocketServer();
  }
  // ✅ Works
  private async spawnPods() {
    const k8sClient = new KubernetesClient();
    const pvcName = `pvc-${this.execution._id}`;
    const setupPodName = `setup-${this.execution._id}`;
    // const EXTRACT_DIR = process.env.EXTRACT_DIR!;
    const EXTRACT_DIR = this.execution.projectId;
    const BLINQ_TOKEN = process.env.BLINQ_TOKEN!;
    const EXECUTION_ID = this.execution._id; 
    const NODE_ENV_BLINQ = process.env.NODE_ENV_BLINQ || 'dev';

    logger.info('🌲🌲🌲🌲🌲 The projectId is', process.env.EXTRACT_DIR, '&', EXTRACT_DIR);

    await k8sClient.applyManifestFromFile(PVC_YAML_PATH, {
      EXECUTION_ID,
    });
    
    let SKIP_SETUP = false; //!
    if(!SKIP_SETUP) {
      await k8sClient.applyManifestFromFile(SETUP_YAML_PATH, {
        EXECUTION_ID,
        EXTRACT_DIR,
        BLINQ_TOKEN,
        BUILD_ID: String(new Date().getTime()),
        NODE_ENV_BLINQ,
      });
  
      logger.info('🚀 Setup pod launched:', setupPodName); 
  
      logger.info(`⏳ Waiting for setup pod ${setupPodName} to complete...`);
      await k8sClient.waitForPodCompletion(setupPodName);
      await k8sClient.deletePod(setupPodName);
      logger.info(`🗑️ Setup pod ${setupPodName} deleted`);
    } else {
      logger.info(`⚠️ Skipping setup pod for ${setupPodName}`);
    }

    this.execution.flows.forEach((flow, flowIndex) => {
      const activeGroupIndex = getActiveGroupIndex(flowIndex);
      const group = flow.scenarioGroups[activeGroupIndex]; 
      const flowGroupKey = getFlowGroupKey(this.execution._id, flowIndex, activeGroupIndex);
      logger.info(`⬆︎ Launching pods for ${flowGroupKey}`);
      if(group.threadCount < 1) console.log(`⚠️ No threads for ${flowGroupKey}`);
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
        logger.info(`🚀 Launching pod ${podId}`);
        k8sClient.createPodFromYaml(podSpec);
      }
    });
  }

  public setupSocketServer() {
    this.io.on('connection', (socket: Socket) => {
      socket.emit("hello", "world");
      socket.on('hello', (msg) => {
        logger.info('👋 Received hello from pod:', msg);
      })
      
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

      logger.info(`🔌 Pod ${podId} connected for tasks in ${flowGroupKey}`);
      const agent = new ExecutionPodAgent(podId, socket);
      this.connectedAgents.set(podId, agent);

      socket.on('ready', (e: any) => {
        logger.info('🔥 Recieved', e)
        const taskQueue = this.flowTaskQueues.get(flowGroupKey);
        if (!taskQueue || taskQueue.length === 0) {
          logger.info(`📭 No tasks left for ${flowGroupKey}`);
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
