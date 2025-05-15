import { Request, Response } from 'express';
import ExecutionModel from '../models/execution.model';
import { ExecutionRunner } from '../classes/ExecutionRunner';
import { TEST_CRON_EXPRESSION, THREAD_LIMIT } from '../constants';
import { io } from '../app';
import { updateStream } from '../utils/sse';
import logger from '../utils/logger';
import mongoose from 'mongoose';
import { scheduleExecutionViaCronjob } from '../schedulers/executionScheduler';
import { generateDynamicCronExpression } from '../utils/scheduling';

export const createExecution = async (req: Request, res: Response) => {
  try {
    const execution = new ExecutionModel(req.body);
    await execution.save();

    // console.log('🚀 Sending update via stream')
    // await updateStream();
    // console.log('🚀 Update sent via stream')

    res.status(201).json(execution);
  } catch (error) {
    console.error('Error creating execution:', error);
    res.status(500).json({ message: 'Failed to create execution.' });
  }
};

export const scheduleExecution = async (req: Request, res: Response) => {
  console.log('🚀 Scheduling execution:', req.params.id, '...');
  const execution = await ExecutionModel.findById(req.params.id);
  if (!execution) return res.status(404).json({ error: 'Execution not found' });

  const envVariables = {
    ...req.body.envVariables,
    EXECUTION_ID:execution._id,
    CRON_EXPRESSION: generateDynamicCronExpression(),
  };
  const schedule = req.body.schedule;
  console.log('▼ Recieved schedule:', JSON.stringify({envVariables, schedule}, null, 2));

  scheduleExecutionViaCronjob(envVariables);
  res.json({ message: 'Execution scheduled' });
}

export const runExecution = async (req: Request, res: Response) => {
  const execution = await ExecutionModel.findById(req.params.id);
  if (!execution) return res.status(404).json({ error: 'Execution not found' });

  const envVariables = req.body;

  console.log('⚙️ Environment variables:', envVariables);

  // set the process.env variables
  for (const [key, value] of Object.entries(envVariables)) {
    console.log(`🌲 Setting ${key} to ${value}`);
    process.env[key] = String(value);
  }

  const runner = new ExecutionRunner(execution, io);
  runner.start(); // trigger K8s interaction etc
  res.json({ message: 'Execution started' });
};

export const getAllExecutions = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid projectId' });
    }

    const executions = await ExecutionModel.find({ projectId });
    res.json(executions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
};

export const getFreeThreadCount = async (req: Request, res: Response) => {
  const { projectId } = req.query;
  const executions = await ExecutionModel.find({ projectId });
  const freeThreadCount = THREAD_LIMIT - executions.reduce((acc, execution) => {
    const threadCount = execution.flows.reduce((sum, flow) => sum + Math.max(...flow.scenarioGroups.map((sg) => sg.threadCount)), 0);
    return acc + (execution.isSingleThreaded ? 1 : threadCount);
  }, 0);
  res.send(freeThreadCount);
};

export const getExecutionById = async (req: Request, res: Response) => {
  const execution = await ExecutionModel.findById(req.params.id);
  if (!execution) return res.status(404).json({ error: 'Execution not found' });
  res.json(execution);
};

export const updateExecution = async (req: Request, res: Response) => {
  if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Valid Execution ID is required' });
  }
  const execution = await ExecutionModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!execution) return res.status(404).json({ error: 'Execution not found' });
  res.json(execution);
};
export const deleteExecution = async (req: Request, res: Response) => {
  const execution = await ExecutionModel.findByIdAndDelete(req.params.id);
  if (!execution) return res.status(404).json({ error: 'Execution not found' });
  res.json({ message: 'Execution deleted' });
}

export const deleteFlow = async (req: Request, res: Response) => {
  try {
    const execution = await ExecutionModel.findById(req.params.id);
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
  } catch (error) {
    console.error('Error deleting flow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};





































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