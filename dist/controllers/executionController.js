"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFlow = exports.deleteExecution = exports.updateExecution = exports.getExecutionById = exports.getReportLinkByIdOfActiveExecution = exports.getFreeThreadCount = exports.getActiveExecutionsStatus = exports.getAllExecutions = exports.runExecution = exports.haltExecution = exports.descheduleExecution = exports.scheduleExecution = exports.createExecution = void 0;
const execution_model_1 = __importDefault(require("../models/execution.model"));
const ExecutionRunner_1 = require("../classes/ExecutionRunner");
const constants_1 = require("../constants");
const app_1 = require("../app");
const mongoose_1 = __importDefault(require("mongoose"));
const executionScheduler_1 = require("../schedulers/executionScheduler");
const scheduling_1 = require("../utils/scheduling");
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const ExecutionRunnerRegistry_1 = require("../classes/ExecutionRunnerRegistry");
const execAsync = util_1.default.promisify(child_process_1.exec);
const createExecution = async (req, res) => {
    try {
        const execution = new execution_model_1.default(req.body);
        execution.running = false;
        await execution.save();
        // console.log('🚀 Sending update via stream')
        // await streamUpdateToClients();
        // console.log('🚀 Update sent via stream')
        res.status(201).json(execution);
    }
    catch (error) {
        console.error('Error creating execution:', error);
        res.status(500).json({ message: 'Failed to create execution.' });
    }
};
exports.createExecution = createExecution;
const scheduleExecution = async (req, res) => {
    console.log('🚀 Scheduling execution:', req.params.id, '...');
    const execution = await execution_model_1.default.findById(req.params.id);
    if (!execution)
        return res.status(404).json({ error: 'Execution not found' });
    const schedule = req.body.schedule;
    const envVariables = {
        ...req.body.envVariables,
        EXECUTION_ID: execution._id,
        CRON_EXPRESSION: (0, scheduling_1.generateDynamicCronExpression)(schedule),
    };
    console.log('▼ Recieved schedule:', JSON.stringify({ schedule: (0, scheduling_1.generateDynamicCronExpression)(schedule) }, null, 2));
    execution.enabled = true;
    execution.save();
    (0, executionScheduler_1.scheduleExecutionViaCronjob)(envVariables);
    res.json({ message: 'Execution scheduled' });
};
exports.scheduleExecution = scheduleExecution;
const descheduleExecution = async (req, res) => {
    console.log('🚀 Descheduling execution:', req.params.id, '...');
    const execution = await execution_model_1.default.findById(req.params.id);
    if (!execution)
        return res.status(404).json({ error: 'Execution not found' });
    const cronJobName = `exec-${execution._id}`;
    try {
        execution.enabled = false;
        await execution.save();
        // Delete the cron job from Kubernetes
        console.log(`🗑️  Deleting Kubernetes CronJob: ${cronJobName}`);
        await execAsync(`kubectl delete cronjob ${cronJobName}`);
        res.json({ message: `Execution ${execution._id} descheduled and cron job deleted.` });
    }
    catch (error) {
        console.error('❌ Failed to deschedule execution:', error.message);
        res.status(500).json({ error: 'Failed to deschedule execution', details: error.message });
    }
};
exports.descheduleExecution = descheduleExecution;
const haltExecution = async (req, res) => {
    const execution = await execution_model_1.default.findById(req.params.id);
    if (!execution)
        return res.status(404).json({ error: 'Execution not found' });
    execution.running = false;
    execution.save();
    const runner = ExecutionRunnerRegistry_1.executionRunnerRegistry.get(execution._id.toString());
    if (!runner) {
        return res.status(400).json({ error: 'Execution is not currently running or already halted' });
    }
    await runner.stop();
    res.json({ message: 'Execution halted successfully' });
};
exports.haltExecution = haltExecution;
const runExecution = async (req, res) => {
    const execution = await execution_model_1.default.findById(req.params.id);
    if (!execution)
        return res.status(404).json({ error: 'Execution not found' });
    const envVariables = req.body;
    // set the process.env variables
    for (const [key, value] of Object.entries(envVariables)) {
        process.env[key] = String(value);
    }
    execution.running = true;
    execution.save();
    const runner = new ExecutionRunner_1.ExecutionRunner(execution, app_1.io);
    runner.start(process.env.RUN_AS_MOCK === 'true'); // trigger K8s interaction etc
    res.json({ message: 'Execution started' });
};
exports.runExecution = runExecution;
const getAllExecutions = async (req, res) => {
    try {
        const { projectId } = req.query;
        process.env.projectId = String(projectId);
        if (!projectId || typeof projectId !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid projectId' });
        }
        const executions = await execution_model_1.default.find({ projectId });
        res.json(executions);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch executions' });
    }
};
exports.getAllExecutions = getAllExecutions;
const getActiveExecutionsStatus = async (req, res) => {
    try {
        const { projectId } = req.query;
        process.env.projectId = String(projectId);
        if (!projectId || typeof projectId !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid projectId' });
        }
        const executions = [];
        for (const [id, runner] of ExecutionRunnerRegistry_1.executionRunnerRegistry.runners.entries()) {
            if (runner.execution.projectId === projectId) {
                executions.push(runner.execution);
            }
        }
        const stats = executions.filter(execution => execution.running).map((e) => e._id.toString()).map((id) => ExecutionRunnerRegistry_1.executionRunnerRegistry.get(id)).filter((runner) => runner !== undefined).map((runner) => runner.executionStatus);
        console.log('🔍 Active executions found:', stats);
        if (stats.length === 0) {
            return res.status(404).json({ error: 'No active executions found' });
        }
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch executions' });
    }
};
exports.getActiveExecutionsStatus = getActiveExecutionsStatus;
const getFreeThreadCount = async (req, res) => {
    const { projectId } = req.query;
    const executions = await execution_model_1.default.find({ projectId });
    const freeThreadCount = constants_1.THREAD_LIMIT - executions.reduce((acc, execution) => {
        const threadCount = execution.flows.reduce((sum, flow) => sum + Math.max(...flow.scenarioGroups.map((sg) => sg.threadCount)), 0);
        return acc + (execution.isSingleThreaded ? 1 : threadCount);
    }, 0);
    res.send(freeThreadCount);
};
exports.getFreeThreadCount = getFreeThreadCount;
const getReportLinkByIdOfActiveExecution = async (req, res) => {
    const executionId = req.params.id;
    const runner = ExecutionRunnerRegistry_1.executionRunnerRegistry.get(executionId);
    if (!runner) {
        return res.status(404).json({ error: 'Execution not found or not running' });
    }
    const reportLink = await runner.getReportLink();
    console.log('🔗 Sending report link for execution:', reportLink);
    if (!reportLink) {
        return res.status(404).json({ error: 'Report link not available for this execution' });
    }
    res.json({ reportLink });
};
exports.getReportLinkByIdOfActiveExecution = getReportLinkByIdOfActiveExecution;
const getExecutionById = async (req, res) => {
    const execution = await execution_model_1.default.findById(req.params.id);
    if (!execution)
        return res.status(404).json({ error: 'Execution not found' });
    res.json(execution);
};
exports.getExecutionById = getExecutionById;
const updateExecution = async (req, res) => {
    if (!req.params.id || !mongoose_1.default.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Valid Execution ID is required' });
    }
    const execution = await execution_model_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!execution)
        return res.status(404).json({ error: 'Execution not found' });
    res.json(execution);
};
exports.updateExecution = updateExecution;
const deleteExecution = async (req, res) => {
    const execution = await execution_model_1.default.findByIdAndDelete(req.params.id);
    if (!execution)
        return res.status(404).json({ error: 'Execution not found' });
    res.json({ message: 'Execution deleted' });
};
exports.deleteExecution = deleteExecution;
const deleteFlow = async (req, res) => {
    try {
        const execution = await execution_model_1.default.findById(req.params.id);
        if (!execution) {
            return res.status(404).json({ error: 'Execution not found' });
        }
        const flowIndex = parseInt(req.params.flowIndex, 10);
        if (isNaN(flowIndex) || flowIndex < 0 || flowIndex >= execution.flows.length) {
            return res.status(400).json({ error: 'Invalid flow index' });
        }
        execution.flows.splice(flowIndex, 1);
        await execution.save();
        res.json({ message: 'Flow deleted successfully', execution });
    }
    catch (error) {
        console.error('Error deleting flow:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteFlow = deleteFlow;
// export const getExecutionLogs = async (req: Request, res: Response) => {
//   const execution = await ExecutionModel.findById(req.params.id);
//   if (!execution) return res.status(404).json({ error: 'Execution not found' });
//   // Assuming logs are stored in the execution object
//   res.json(execution.logs);
// }
// export const getExecutionStatus = async (req: Request, res: Response) => {
//   const execution = await ExecutionModel.findById(req.params.id);
//   if (!execution) return res.status(404).json({ error: 'Execution not found' });
//   // Assuming status is stored in the execution object
//   res.json({ status: execution.status });
// }
// export const getExecutionResults = async (req: Request, res: Response) => {
//   const execution = await ExecutionModel.findById(req.params.id);
//   if (!execution) return res.status(404).json({ error: 'Execution not found' });
//   // Assuming results are stored in the execution object
//   res.json(execution.results);
// }
