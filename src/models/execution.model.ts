import mongoose, { Schema, Document } from 'mongoose';

export interface Scenario {
  featureIndex: number;
  scenarioIndex: number;
  weight: number;
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
  flows: Flow[];
  schedule: Schedule;
  isSingleThreaded: boolean;
  enabled: boolean;
  userId: string;
  projectId: string;
}

const executionSchema = new Schema<Execution>({
  name: String,
  env: String,
  flows: Array,
  schedule: Object,
  isSingleThreaded: Boolean,
  enabled: Boolean,
  userId: String,
  projectId: String,
});

export default mongoose.model<Execution>('Execution', executionSchema);
