import { Request, Response } from 'express';
import ExecutionModel, { CronJobEnvVariables, ExecEnvVars, Execution, ExecutionStatus, Schedule } from '../models/execution.model';
import { ExecutionRunner } from '../classes/ExecutionRunner';
import { io } from '../app';
import mongoose from 'mongoose';
import { scheduleExecutionViaCronjob } from '../schedulers/executionScheduler';
import { generateDynamicCronExpression } from '../utils/scheduling';
import { exec } from 'child_process';
import { promisify } from 'util';

import { executionRunnerRegistry } from '../classes/ExecutionRunnerRegistry';
import { KubernetesClient } from '../classes/KubernetesClient';

// const execAsync = promisify(exec);
export const createExecution = async (req: Request, res: Response) => {
  try {
    const execution = new ExecutionModel(req.body);
    execution.running = false;
    await execution.save();
    res.status(201).json(execution);
  } catch (error) {
    console.error('❌ Error creating execution:', error);
    res.status(500).json({ message: 'Failed to create execution.' });
  }
};

export const scheduleExecution = async (req: Request, res: Response) => {
  console.log('🚀 Scheduling execution:', req.params.id, '...');
  const execution = await ExecutionModel.findById(req.params.id);
  if (!execution) return res.status(404).json({ error: '❌ Execution not found' });

  const schedule: Schedule = req.body.schedule;
  const envVariables = {
    ...req.body.envVariables,
    EXECUTION_ID: execution._id,
    CRON_EXPRESSION: generateDynamicCronExpression(schedule),
  };
  // console.log('▼ Recieved schedule:', JSON.stringify({ schedule: generateDynamicCronExpression(schedule) }, null, 2));

  execution.enabled = true;
  execution.save();

  scheduleExecutionViaCronjob(envVariables);
  res.json({ message: 'Execution scheduled' });
}
type DeleteCronJobResult = { error?: Error };

async function deleteCronJob(execution: Execution, deschedule = false): Promise<DeleteCronJobResult> {

  const cronJobName = `exec-cronjob-${execution._id}`;
  const k8sClient = new KubernetesClient();
  try {
    if (deschedule) {
      execution.enabled = false;
      await execution.save();
    }

    console.log(`🗑️  Deleting Kubernetes CronJob: ${cronJobName}`);
    await k8sClient.deleteCronJob(cronJobName);
    // await execAsync(`kubectl delete cronjob ${cronJobName}`);
    return {};
  } catch (error: any) {
    return error;
  }
}

export const descheduleExecution = async (req: Request, res: Response) => {
  console.log('🚀 Descheduling execution:', req.params.id, '...');

  const execution = await ExecutionModel.findById(req.params.id);
  if (!execution) return res.status(404).json({ error: 'Execution not found' });

  const { error }: DeleteCronJobResult = await deleteCronJob(execution, true);
  if (error) {
    console.error('❌ Failed to deschedule execution:', error.message);
    res.status(500).json({ error: 'Failed to deschedule execution', details: error.message });
  } else {
    res.json({ message: `Execution ${execution._id} descheduled and cron job deleted.` });
  }
};

export const haltExecution = async (req: Request, res: Response) => {
  const execution = await ExecutionModel.findById(req.params.id);
  if (!execution) return res.status(404).json({ error: 'Execution not found' });

  execution.running = false;
  execution.save();

  const runner = executionRunnerRegistry.get(execution._id.toString());
  if (!runner) {
    return res.status(400).json({ error: 'Execution is not currently running or already halted' });
  }

  await runner.stop();
  res.json({ message: 'Execution halted successfully' });
}

export const runExecution = async (req: Request, res: Response) => {
  const execution = await ExecutionModel.findById(req.params.id);
  if (!execution) return res.status(404).json({ error: 'Execution not found' });

  if(execution.running) {
    return res.json({ message: 'Execution is already running!' });
  }

  const envVariables = req.body;


  // set the process.env variables
  for (const [key, value] of Object.entries(envVariables)) {
    process.env[key] = String(value);
  }

  execution.running = true;
  execution.save();

  const execEnvVars: ExecEnvVars = {
    BLINQ_TOKEN: String(envVariables.BLINQ_TOKEN ?? ''),
    VIA_CRON: String(envVariables.VIA_CRON ?? ''),
    HEADLESS: String(envVariables.HEADLESS ?? ''),
    NODE_ENV_BLINQ: String(envVariables.NODE_ENV_BLINQ ?? 'app'),
    RUN_AS_MOCK: String(envVariables.RUN_AS_MOCK ?? ''),
  }

  const runner = new ExecutionRunner(execution, io, execEnvVars);
  runner.start(envVariables.RUN_AS_MOCK === 'true');
  res.json({ message: 'Execution started' });
};

export const getAllExecutions = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    process.env.projectId = String(projectId);

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid projectId' });
    }

    const executions = await ExecutionModel.find({ projectId });
    res.json(executions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
};
export const getActiveExecutionsStatus = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    process.env.projectId = String(projectId);

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid projectId' });
    }

    const executions = [];

    for (const [id, runner] of executionRunnerRegistry.runners.entries()) {
      if (runner.execution.projectId === projectId) {
        executions.push(runner.execution);
      }
    }

    const stats = executions.filter(execution => execution.running).map((e) => e._id.toString()).map((id) => executionRunnerRegistry.get(id)).filter((runner) => runner !== undefined).map((runner) => runner.executionStatus);

    console.log('🔍 Active executions found:', stats);
    if (stats.length === 0) {
      return res.status(404).json({ error: 'No active executions found' });
    }

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
};


export const getFreeThreadCount = async (req: Request, res: Response) => {
  const { projectId, maxExecutionThreads: maxExecutionThreadsForProject } = req.query;
  const executions = await ExecutionModel.find({ projectId });
  const freeThreadCount = Number(maxExecutionThreadsForProject ?? 0) - executions.reduce((acc, execution) => {
    const threadCount = execution.flows.reduce((sum, flow) => sum + Math.max(...flow.scenarioGroups.map((sg) => sg.threadCount)), 0);
    return acc + (execution.isSingleThreaded ? 1 : threadCount);
  }, 0);
  res.send(freeThreadCount);
};

export const getReportLinkByIdOfActiveExecution = async (req: Request, res: Response) => {
  const executionId = req.params.id;
  const runner = executionRunnerRegistry.get(executionId);
  if (!runner) {
    return res.status(404).json({ error: 'Execution not found or not running' });
  }
  const reportLink = await runner.getReportLink();
  if (!reportLink) {
    return res.status(404).json({ error: 'Report link not available for this execution' });
  }
  res.json({ reportLink });
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

  const { wasScheduleUpdated, BLINQ_TOKEN, NODE_ENV_BLINQ } = req.query;
  if (wasScheduleUpdated === 'true') {
    // delete cron job and recreate the cron job but dont deschedule it
    await deleteCronJob(execution, false);
    const envVariables: CronJobEnvVariables = {
      EXECUTION_ID: execution._id,
      CRON_EXPRESSION: generateDynamicCronExpression(execution.schedule),
      EXTRACT_DIR: execution.projectId,
      BLINQ_TOKEN: BLINQ_TOKEN ? String(BLINQ_TOKEN) : '',
      NODE_ENV_BLINQ: NODE_ENV_BLINQ ? String(NODE_ENV_BLINQ) : 'app',
      HEADLESS: true
    };

    await new Promise(resolve => setTimeout(resolve, 5000));
    scheduleExecutionViaCronjob(envVariables);
  }

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