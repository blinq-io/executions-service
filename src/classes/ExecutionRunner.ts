// src/classes/ExecutionRunner.ts
import { Execution, Task, TaskResult } from '../models/execution.model';
import { ExecutionPodAgent } from './ExecutionPodAgent';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { KubernetesClient } from './KubernetesClient';

import { BACKEND_SOCKET_URL, FINISHED_FLOW_SIGNAL, FINISHED_SG_SIGNAL, PVC_YAML_PATH, SETUP_YAML_PATH } from '../constants';
import { generateWorkerYaml } from '../config_files/generateWorkerYaml';
import { getFlowGroupKey, getTasksArray, parsePodId } from '../utils/execData';
import logger from '../utils/logger';
import { executionRunnerRegistry } from './ExecutionRunnerRegistry';

export class ExecutionRunner {
  private io: SocketIOServer;
  private execution: Execution;
  private connectedAgents: Map<string, ExecutionPodAgent[]> = new Map();
  private flowQueues: Map<number, Task[][]> = new Map();
  private flowStatus: Map<number, boolean> = new Map();
  private abortExecutionController: AbortController | null = null;

  constructor(execution: Execution, io: SocketIOServer) {
    this.execution = execution;
    this.io = io;
    this.initializeQueues();
  }

  private simulateMockExecution = async () => {
    const id = setInterval(() => console.log('🧪 Mock execution running...'), 1000);
    await new Promise((res) => setTimeout(res, 500000));
    clearInterval(id);
    console.log('🧪 Mock execution finished')

    this.execution.running = false;
    this.execution.save();
  }

  //TODO
  private executionCleanup = () => {
    // this.execution.flows.forEach((flow, flowIndex) => {
    //   const flowQueue = this.flowQueues.get(flowIndex);
    //   if (flowQueue && flowQueue.length > 0) {
    //     return;
    //   }
    // });

    // console.log(`🗑️ All flows finished for execution ${this.execution._id}`);

    this.execution.running = false;
    this.execution.save();
  }

  private getActiveGroupIndex = (flowIndex: number): number => {
    const flowQueue = this.flowQueues.get(flowIndex);
    if (flowQueue!.length == 0) {
      return FINISHED_FLOW_SIGNAL;
    }
    const sgTasks = flowQueue![0];
    const id = sgTasks[0].id;
    //? taskId structure is `task-flow${flowIndex}-sg${groupIndex}-f${scenario.featureIndex}-s${scenario.scenarioIndex}`
    return Number(id.split('-')[2].split('sg')[1]); //? extract group index from taskId
  }

  private launchPodsForActiveGroup = async (flowIndex: number) => {
    const EXTRACT_DIR = this.execution.projectId;
    const BLINQ_TOKEN = process.env.BLINQ_TOKEN!;
    const k8sClient = new KubernetesClient();


    const activeGroupIndex = this.getActiveGroupIndex(flowIndex);
    if (activeGroupIndex === FINISHED_FLOW_SIGNAL) {
      return FINISHED_FLOW_SIGNAL;
    }

    const allocatedThreads = this.execution.flows[flowIndex].scenarioGroups[activeGroupIndex].threadCount;
    const flowGroupKey = getFlowGroupKey(this.execution._id, flowIndex, activeGroupIndex);
    const EXECUTION_ID = this.execution._id;
    for (let i = 0; i < allocatedThreads; i++) {
      const POD_ID = `${flowGroupKey}.w${i}`;
      const podSpec = generateWorkerYaml({
        EXECUTION_ID,
        EXTRACT_DIR,
        POD_ID,
        BLINQ_TOKEN,
        SOCKET_URL: BACKEND_SOCKET_URL,
      });
      console.log(`🚀 Launching pod ${POD_ID}`);
      await k8sClient.createPodFromYaml(podSpec);
    }
    return flowIndex;
  }

  private initializeQueues() {
    this.execution.flows.forEach((flow, flowIndex) => {
      const q = this.flowQueues.get(flowIndex) || [];
      flow.scenarioGroups.forEach((group, groupIndex) => {
        q.push(getTasksArray(group.scenarios, flowIndex, groupIndex));
      });
      this.flowQueues.set(flowIndex, q);
      this.flowStatus.set(flowIndex, true);
    });
  }

  public async stop() {
    console.log(`🛑 Stopping execution ${this.execution._id}`);

    this.execution.running = false;
    await this.execution.save();

    this.abortExecutionController?.abort();
    this.abortExecutionController = null;
    for (const [groupKey, agents] of this.connectedAgents.entries()) {
      console.log(`🗑️ Shutting down pods for group ${groupKey}`);
      agents.forEach(agent => {
        console.log(`⚠️ Sending shutdown to pod ${agent.id}`);
        agent.socket.emit('shutdown');
      });
    }

    const k8sClient = new KubernetesClient();
    try {
      await k8sClient.deletePod(`setup-${this.execution._id}`);
      console.log(`🗑️ Setup pod deleted`);
    } catch (err: any) {
      console.warn(`⚠️ Failed to delete setup pod`, err.message);
    }
    for (const [groupKey, agents] of this.connectedAgents.entries()) {
      for (const agent of agents) {
        try {
          await k8sClient.deletePod(agent.id);
          console.log(`🗑️ Pod ${agent.id} deleted`);
        } catch (err: any) {
          console.warn(`⚠️ Failed to delete pod ${agent.id}:`, err.message);
        }
      }
    }

    const { executionRunnerRegistry } = await import('./ExecutionRunnerRegistry');
    executionRunnerRegistry.remove(this.execution._id.toString());
  }

  public async start(mock = false) {
    try {
      await new Promise(async (resolve, reject) => {
        this.abortExecutionController = new AbortController();
        this.abortExecutionController.signal.addEventListener('abort', () => {
          reject(new Error('Execution aborted'));
        })

        console.log(`🚀 Execution ${this.execution.name} starting...`);
        executionRunnerRegistry.set(this.execution._id.toString(), this);
        if (mock) {
          this.simulateMockExecution()
          return;
        }
        await this.spawnPods();
        resolve('Execution started');
      })
    } catch (error) {
      console.error('❌ Execution failed:', error);
      this.execution.running = false;
      await this.execution.save();
      return;
    }
  }
  // ✅ Works
  private async spawnPods() {
    const k8sClient = new KubernetesClient();
    const pvcName = `pvc-${this.execution._id}`;
    const setupPodName = `setup-${this.execution._id}`;
    const EXTRACT_DIR = this.execution.projectId;
    const BLINQ_TOKEN = process.env.BLINQ_TOKEN!;
    const EXECUTION_ID = this.execution._id;
    const NODE_ENV_BLINQ = process.env.NODE_ENV_BLINQ || 'dev';

    try {
      await k8sClient.applyManifestFromFile(PVC_YAML_PATH, {
        EXECUTION_ID,
      });

      let SKIP_SETUP = false; //!
      if (!SKIP_SETUP) {
        await k8sClient.applyManifestFromFile(SETUP_YAML_PATH, {
          EXECUTION_ID,
          EXTRACT_DIR,
          BLINQ_TOKEN,
          BUILD_ID: String(new Date().getTime()),
          NODE_ENV_BLINQ,
        });

        console.log(`⏳ Waiting for setup pod ${setupPodName} to complete...`);
        await k8sClient.waitForPodCompletion(setupPodName);
        await k8sClient.deletePod(setupPodName);
        console.log(`🗑️ Setup pod ${setupPodName} deleted`);
      } else {
        console.log(`⚠️ Skipping setup pod for ${setupPodName}`);
      }
    } catch (error) {
      console.error('❌ Failed to spawn pods:', error);
    }

    for (let flowIndex = 0; flowIndex < this.execution.flows.length; flowIndex++) {
      {
        this.launchPodsForActiveGroup(flowIndex);
      }
    }
  }

  public handlePodConnection(socket: Socket, parsed: ReturnType<typeof parsePodId>) {
    const { flowIndex, groupIndex, executionId, workerNumber } = parsed;
    const podId = socket.handshake.query.podId as string;
    const flowGroupKey = getFlowGroupKey(this.execution._id, flowIndex, groupIndex);

    console.log(`🔌 Pod ${podId} connected for tasks in ${this.execution.name} (Flow ${flowIndex + 1}, SG ${groupIndex + 1})`);
    const agent = new ExecutionPodAgent(podId, socket);
    const currPodsForThisGroup = this.connectedAgents.get(flowGroupKey) || [];
    this.connectedAgents.set(flowGroupKey, [...currPodsForThisGroup, agent]);
    console.log('👥 Updated connected pods for this group:', this.connectedAgents.get(flowGroupKey)?.map((pod) => pod.id));

    socket.on('ready', async (e: any) => {
      const flowQueue = this.flowQueues.get(flowIndex);

      if (!flowQueue || flowQueue.length === 0) {
        console.log(`📭 No tasks left for Flow ${flowIndex + 1}`);
        socket.emit('shutdown');
        return;
      }

      if(!this.flowStatus.get(flowIndex)) {
        console.log(`📭 Flow ${flowIndex + 1} is no longer allowed to run because of a failed group, preventing further groups' execution`);
        socket.emit('shutdown');
        return;
      }

      const sgTasks = flowQueue[0];
      //? if the group is finished, we can move to the next group by cleaning up the current group and initiating the next group
      if (sgTasks.length === 0) {
        console.log(`📭 No tasks left for Group ${groupIndex} of Flow ${flowIndex + 1}.`);

        const remainingPodsForThisGroup = (this.connectedAgents.get(flowGroupKey) || []).filter((a) => a.id !== podId);
        this.connectedAgents.set(flowGroupKey, remainingPodsForThisGroup);
        //? If this is the last pod in the group & the flow is still allowed to run & the execution is running
        //? then we can move to the next group
        if (remainingPodsForThisGroup.length === 0 && this.flowStatus.get(flowIndex) && this.execution.running) {
          flowQueue.shift();
          console.log(`🪦 Last Pod is trying to spawn the pods for the next group`);
          await this.launchPodsForActiveGroup(flowIndex);
        }
        socket.emit('shutdown');
        return;
      } else {
        const task = sgTasks.shift();
        agent.assignTask(task!);
      }
    });

    socket.on('task-complete', (result: TaskResult) => {
      const wasSuccessful = result.exitCode === 0;
      if (wasSuccessful) {
        console.log(`✅ Pod ${podId} completed task ${result.taskId}`);
      } else {
        console.error(`❌ Pod ${podId} failed task ${result.taskId}`);
        const flowIndex = Number(result.taskId.split('-')[1].split('flow')[1]);
        if (result.task.retriesRemaining > 0) {
          result.task.retriesRemaining--;
          console.log(`🔄 Retrying task ${result.taskId}, (${result.task.retriesRemaining} retries left)`);
          const flowQueue = this.flowQueues.get(flowIndex);
          if (flowQueue) {
            flowQueue[0].push(result.task);
          }
        } else {
          console.error(`❌ Task ${result.taskId} failed and has no retries left, halting execution for Flow ${flowIndex + 1}`);
          this.flowStatus.set(flowIndex, false);
          socket.emit('shutdown');
        }
      }
    })


    socket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.warn('⚠️ Socket disconnected:', reason);
      this.connectedAgents.delete(podId);
    });
  }

}
