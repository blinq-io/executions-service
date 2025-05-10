import { Request, Response } from 'express';
import ExecutionModel from '../models/execution.model';
import { ExecutionRunner } from '../classes/ExecutionRunner';
import { THREAD_LIMIT } from '../constants';
import { io } from '../app';
import { updateStream } from '../utils/sse';

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


export const runExecution = async (req: Request, res: Response) => {
  const execution = await ExecutionModel.findById(req.params.id);
  if (!execution) return res.status(404).json({ error: 'Execution not found' });

  const environmentVariables = req.body;

  console.log('⚙️ Environment variables:', environmentVariables);
  
  // set the process.env variables
  for (const [key, value] of Object.entries(environmentVariables)) {
    process.env[key] = String(value);
  }

  console.log('✅ Environment variables set:', {
    token: process.env.BLINQ_TOKEN, 
    projectId: process.env.EXTRACT_DIR
  });

  const runner = new ExecutionRunner(execution, io);
  runner.start(); // trigger K8s interaction etc
  res.json({ message: 'Execution started' });
};

export const getAllExecutions = async (req: Request, res: Response) => {
  const executions = await ExecutionModel.find();
  res.json(executions);
}

export const getFreeThreadCount = async (req: Request, res: Response) => {
  const executions = await ExecutionModel.find();
  const freeThreadCount = THREAD_LIMIT - executions.reduce((acc, execution) => {
    const threadCount = execution.flows.reduce((sum, flow) => sum + Math.max(...flow.scenarioGroups.map((sg) => sg.threadCount)), 0);
    return acc + (execution.isSingleThreaded ? 1 : threadCount);
  }, 0);
  res.send({ freeThreadCount });
};

export const getExecutionById = async (req: Request, res: Response) => {
  const execution = await ExecutionModel.findById(req.params.id);
  if (!execution) return res.status(404).json({ error: 'Execution not found' });
  res.json(execution);
};
export const updateExecution = async (req: Request, res: Response) => {
  const execution = await ExecutionModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!execution) return res.status(404).json({ error: 'Execution not found' });
  res.json(execution);
};
export const deleteExecution = async (req: Request, res: Response) => {
  const execution = await ExecutionModel.findByIdAndDelete(req.params.id);
  if (!execution) return res.status(404).json({ error: 'Execution not found' });
  res.json({ message: 'Execution deleted' });
}

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