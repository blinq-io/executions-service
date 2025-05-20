import { ExecutionRunner } from './ExecutionRunner';

class ExecutionRunnerRegistry {
  private runners: Map<string, ExecutionRunner> = new Map();

  set(executionId: string, runner: ExecutionRunner) {
    this.runners.set(executionId, runner);
  }

  get(executionId: string): ExecutionRunner | undefined {
    return this.runners.get(executionId);
  }

  remove(executionId: string) {
    this.runners.delete(executionId);
  }

  has(executionId: string): boolean {
    return this.runners.has(executionId);
  }
}

export const executionRunnerRegistry = new ExecutionRunnerRegistry();
