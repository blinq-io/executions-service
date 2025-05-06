import { Request, Response } from 'express';
import ExecutionModel from '../models/execution.model';
import { ExecutionRunner } from '../classes/ExecutionRunner';
import { THREAD_LIMIT } from '../constants';
import { io } from '../app';

export const createExecution = async (req: Request, res: Response) => {
  const execution = new ExecutionModel(req.body);
  await execution.save();
  res.status(201).json(execution);
};

export const runExecution = async (req: Request, res: Response) => {
  const execution = await ExecutionModel.findById(req.params.id);
  if (!execution) return res.status(404).json({ error: 'Execution not found' });

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