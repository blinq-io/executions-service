"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionRunner = void 0;
const ExecutionPodAgent_1 = require("./ExecutionPodAgent");
const KubernetesClient_1 = require("./KubernetesClient");
const constants_1 = require("../constants");
const generateWorkerYaml_1 = require("../config_files/generateWorkerYaml");
const execData_1 = require("../utils/execData");
const ExecutionRunnerRegistry_1 = require("./ExecutionRunnerRegistry");
const executionStatus_1 = require("../utils/sse/executionStatus");
const general_1 = require("../utils/general");
class ExecutionRunner {
    constructor(execution, io) {
        this.connectedAgents = new Map();
        this.flowQueues = new Map();
        this.flowStatus = new Map();
        this.abortExecutionController = null;
        this.runId = null;
        this.simulateMockExecution = async () => {
            const id = setInterval(() => console.log('🧪 Mock execution running...'), 5000);
            let duration = this.executionStatus.totalScenarios * 2000; // Simulate 2 seconds per scenario
            const interval = setInterval(() => {
                this.updateStatus(Math.random() > 0.5);
            }, 2000);
            await new Promise((res) => setTimeout(res, duration));
            clearInterval(interval);
            clearInterval(id);
            console.log('🧪 Mock execution finished');
            this.execution.running = false;
            this.execution.save();
        };
        this.getActiveGroupIndex = (flowIndex) => {
            console.log('🍊');
            for (let [id, queue] of this.flowQueues.entries()) {
                console.log(`🚀 Flow ${id} -> `, JSON.stringify(queue, null, 2));
            }
            const flowQueue = this.flowQueues.get(flowIndex);
            if (flowQueue.length == 0) {
                return constants_1.FINISHED_FLOW_SIGNAL;
            }
            const sgTasks = flowQueue[0];
            const id = sgTasks[0].id;
            //? taskId structure is `task-flow${flowIndex}-sg${groupIndex}-f${scenario.featureIndex}-s${scenario.scenarioIndex}`
            return Number(id.split('-')[2].split('sg')[1]); //? extract group index from taskId
        };
        this.launchPodsForActiveGroup = async (flowIndex) => {
            const EXTRACT_DIR = this.execution.projectId;
            const BLINQ_TOKEN = process.env.BLINQ_TOKEN;
            const k8sClient = new KubernetesClient_1.KubernetesClient();
            const activeGroupIndex = this.getActiveGroupIndex(flowIndex);
            if (activeGroupIndex === constants_1.FINISHED_FLOW_SIGNAL) {
                this.ifExecutionFinished();
                return constants_1.FINISHED_FLOW_SIGNAL;
            }
            const allocatedThreads = this.execution.flows[flowIndex].scenarioGroups[activeGroupIndex].threadCount;
            const flowGroupKey = (0, execData_1.getFlowGroupKey)(this.execution._id, flowIndex, activeGroupIndex);
            const EXECUTION_ID = this.execution._id;
            for (let i = 0; i < allocatedThreads; i++) {
                const POD_ID = `${flowGroupKey}.w${i}`;
                const podSpec = (0, generateWorkerYaml_1.generateWorkerYaml)({
                    EXECUTION_ID,
                    EXTRACT_DIR,
                    POD_ID,
                    BLINQ_TOKEN,
                    SOCKET_URL: constants_1.BACKEND_SOCKET_URL,
                });
                console.log(`🚀 Launching pod ${POD_ID}`);
                try {
                    await k8sClient.createPodFromYaml(podSpec);
                }
                catch (error) {
                    this.stop();
                    return -1;
                }
            }
            return flowIndex;
        };
        this.agentCleanup = async (k8sClient, agent) => {
            agent.socket.emit('shutdown');
            try {
                await k8sClient.deletePod(agent.id);
            }
            catch (err) {
                console.warn(`⚠️ Failed to delete pod ${agent.id}:`, err.message);
            }
        };
        this.execution = execution;
        this.io = io;
        this.initializeQueues();
        this.executionStatus = {
            'executionId': execution._id,
            'scenariosFailed': 0,
            'scenariosPassed': 0,
            'totalScenarios': execution.flows.reduce((acc, flow) => acc + flow.scenarioGroups.reduce((sum, sg) => sum + sg.scenarios.length, 0), 0),
            'startTime': new Date()
        };
    }
    async getReportLink() {
        if (!this.runId) {
            return null;
        }
        if (this.runId === 'loading') {
            console.log('🔄 Waiting for runId to be initialized...');
            while (this.runId === 'loading') {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            return this.getReportLink();
        }
        const env = process.env.NODE_ENV_BLINQ || 'app';
        const link = env === 'app' ?
            `https://www.app.blinq.io/${this.execution.projectId}/run-report/${this.runId}` :
            `https://www.${env}.app.blinq.io/${this.execution.projectId}/run-report/${this.runId}`;
        return link;
    }
    async initializeQueues() {
        this.runId = 'loading';
        const runId = await (0, general_1.createRun)(this.execution.name, process.env.BLINQ_TOKEN, process.env.NODE_ENV_BLINQ || 'app');
        if (!runId)
            return;
        this.runId = runId;
        this.execution.flows.forEach((flow, flowIndex) => {
            const q = this.flowQueues.get(flowIndex) || [];
            flow.scenarioGroups.forEach((group, groupIndex) => {
                (0, execData_1.injectRunIdInScenarios)(group.scenarios, runId, this.execution.projectId);
                q.push((0, execData_1.getTasksArray)(group.scenarios, flowIndex, groupIndex));
            });
            this.flowQueues.set(flowIndex, q);
            this.flowStatus.set(flowIndex, true);
        });
    }
    async stop() {
        if (!this.execution.running) {
            return;
        }
        console.log(`🛑 Stopping execution ${this.execution._id}...`);
        this.execution.running = false;
        this.execution.save();
        const k8sClient = new KubernetesClient_1.KubernetesClient();
        for (const [groupKey, agents] of this.connectedAgents.entries()) {
            console.log(`🗑️ Cleaning pods for group ${groupKey}`);
            agents.forEach(agent => {
                this.agentCleanup(k8sClient, agent);
            });
        }
        const setupPodName = `setup-${this.execution._id}`;
        try {
            const podStatus = await k8sClient.getPodStatus(setupPodName);
            if (podStatus) {
                await k8sClient.deletePod(setupPodName);
            }
            else {
            }
        }
        catch (err) {
            console.warn(`⚠️ Failed to delete setup pod`, err.message);
        }
        const { executionRunnerRegistry } = await Promise.resolve().then(() => __importStar(require('./ExecutionRunnerRegistry')));
        executionRunnerRegistry.remove(this.execution._id.toString());
    }
    async start(mock = false) {
        this.executionStatus.startTime = new Date();
        ExecutionRunnerRegistry_1.executionRunnerRegistry.set(this.execution._id.toString(), this);
        (0, executionStatus_1.streamUpdateToClients)();
        if (mock) {
            this.simulateMockExecution();
            return;
        }
        await this.spawnPods();
    }
    // ✅ Works
    async spawnPods() {
        const k8sClient = new KubernetesClient_1.KubernetesClient();
        const pvcName = `pvc-${this.execution._id}`;
        const setupPodName = `setup-${this.execution._id}`;
        const EXTRACT_DIR = this.execution.projectId;
        const BLINQ_TOKEN = process.env.BLINQ_TOKEN;
        const EXECUTION_ID = this.execution._id;
        const NODE_ENV_BLINQ = process.env.NODE_ENV_BLINQ || 'dev';
        try {
            await k8sClient.applyManifestFromFile(constants_1.PVC_YAML_PATH, {
                EXECUTION_ID,
            });
            if (process.env.SKIP_SETUP === 'false') {
                await k8sClient.applyManifestFromFile(constants_1.SETUP_YAML_PATH, {
                    EXECUTION_ID,
                    EXTRACT_DIR,
                    BLINQ_TOKEN,
                    BUILD_ID: String(new Date().getTime()),
                    NODE_ENV_BLINQ,
                });
                await k8sClient.waitForPodCompletion(setupPodName);
                await k8sClient.deletePod(setupPodName);
            }
            else {
                console.log(`⚠️ Skipping setup pod for ${setupPodName}`);
            }
        }
        catch (error) {
            console.error('❌ Failed to spawn setup pod or PVC:', error);
            this.stop();
            return;
        }
        for (let flowIndex = 0; flowIndex < this.execution.flows.length; flowIndex++) {
            {
                this.launchPodsForActiveGroup(flowIndex);
            }
        }
    }
    ifExecutionFinished() {
        for (const [flowIndex, flowQueue] of this.flowQueues.entries()) {
            if (flowQueue.length !== 0) {
                return;
            }
        }
        this.stop();
        console.log(`✅ Execution ${this.execution._id} finished successfully!`);
    }
    updateStatus(wasSuccessful) {
        if (wasSuccessful) {
            this.executionStatus.scenariosPassed++;
        }
        else {
            this.executionStatus.scenariosFailed++;
        }
        (0, executionStatus_1.streamUpdateToClients)();
    }
    handlePodConnection(socket, parsed) {
        const { flowIndex, groupIndex, executionId, workerNumber } = parsed;
        const podId = socket.handshake.query.podId;
        const flowGroupKey = (0, execData_1.getFlowGroupKey)(this.execution._id, flowIndex, groupIndex);
        console.log(`🔌 Pod ${podId} connected for tasks in ${this.execution.name} (Flow ${flowIndex + 1}, SG ${groupIndex + 1})`);
        const agent = new ExecutionPodAgent_1.ExecutionPodAgent(podId, socket);
        const currPodsForThisGroup = this.connectedAgents.get(flowGroupKey) || [];
        this.connectedAgents.set(flowGroupKey, [...currPodsForThisGroup, agent]);
        socket.on('ready', async (e) => {
            console.log('💤 Inducing sleep for 10 seconds');
            await new Promise(resolve => setTimeout(resolve, 20000));
            const flowQueue = this.flowQueues.get(flowIndex);
            if (!flowQueue || flowQueue.length === 0) {
                console.log(`📭 No tasks left for Flow ${flowIndex + 1}`);
                socket.emit('shutdown');
                this.ifExecutionFinished();
                return;
            }
            if (!this.flowStatus.get(flowIndex)) {
                console.log(`📭 Flow ${flowIndex + 1} is no longer allowed to run because of a failed group, preventing further groups' execution`);
                socket.emit('shutdown');
                this.ifExecutionFinished();
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
            }
            else {
                const task = sgTasks.shift();
                agent.assignTask(task);
            }
        });
        socket.on('task-complete', (result) => {
            const wasSuccessful = result.exitCode === 0;
            if (wasSuccessful) {
                console.log(`✅ Pod ${podId} completed task ${result.taskId}`);
                this.updateStatus(true);
            }
            else {
                console.error(`❌ Pod ${podId} failed task ${result.taskId}`);
                const flowIndex = Number(result.taskId.split('-')[1].split('flow')[1]);
                if (result.task.retriesRemaining > 0) {
                    result.task.retriesRemaining--;
                    console.log(`🔄 Retrying task ${result.taskId}, (${result.task.retriesRemaining} retries left)`);
                    const flowQueue = this.flowQueues.get(flowIndex);
                    if (flowQueue) {
                        flowQueue[0].push(result.task);
                    }
                }
                else {
                    console.error(`❌ Task ${result.taskId} failed and has no retries left, halting execution for Flow ${flowIndex + 1}`);
                    this.flowStatus.set(flowIndex, false);
                    this.updateStatus(false);
                    socket.emit('shutdown');
                }
            }
        });
        socket.on('connect_error', (err) => {
            console.error('❌ Socket connection error:', err.message);
        });
        socket.on('disconnect', (reason) => {
            console.warn('⚠️ Socket disconnected:', reason);
            this.connectedAgents.delete(podId);
        });
    }
}
exports.ExecutionRunner = ExecutionRunner;
