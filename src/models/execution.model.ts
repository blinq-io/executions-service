import mongoose, { Schema, Document } from 'mongoose';
import { streamUpdateToClients } from '../utils/sse/executionCRUD';

export interface CronJobEnvVariables {
  EXECUTION_ID: string;
  CRON_EXPRESSION: string;
  EXTRACT_DIR: string;
  BLINQ_TOKEN: string;
  NODE_ENV_BLINQ: string;
  HEADLESS: boolean;
}

export interface TaskResult {
  taskId: string;
  exitCode: number | null;
  task: Task;
}

export interface Scenario {
  featureIndex: number;
  scenarioIndex: number;
  command: string;
}

export interface ScenarioGroup {
  name: string;
  threadCount: number;
  scenarios: Scenario[];
  tags: string[];
}

export interface Flow {
  branch: string;
  viewport: string;
  browser: string;
  scenarioGroups: ScenarioGroup[];
}

export interface Schedule {
  days: string[];
  isBiweekly: boolean;
  time: string;
  timeZone: number;
}

export interface Execution extends Document {
  _id: string;
  name: string;
  env: string;
  branch: string;
  flows: Flow[];
  schedule: Schedule;
  isSingleThreaded: boolean;
  enabled: boolean;
  userId: string;
  projectId: string;
  running: boolean;
}

const executionSchema = new Schema<Execution>({
  name: String,
  env: String,
  branch: String,
  flows: Array,
  schedule: Object,
  isSingleThreaded: Boolean,
  enabled: Boolean,
  userId: String,
  projectId: String,
  running: Boolean,
});

function streamUpdate (doc: Execution) {
streamUpdateToClients();
}

executionSchema.post('save', streamUpdate);
executionSchema.post('findOneAndUpdate', streamUpdate);
executionSchema.post('findOneAndDelete', streamUpdate);

export default mongoose.model<Execution>('Execution', executionSchema);

export interface Task {
  id: string;
  data: Scenario;
  retriesRemaining: number;
}

export type ExecutionStatus = {
  executionId: string;
  totalScenarios: number;
  scenariosPassed: number;
  scenariosFailed: number;
  startTime: Date;
};
