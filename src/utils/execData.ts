import { MAX_ATTEMPTS_PER_TASK } from "../constants";
import { Scenario, Task } from "../models/execution.model";

export const getFlowGroupKey = (executionId: string, flowIndex: number, activeGroupIndex: number) => {
    return `${executionId}.flow${flowIndex}.sg${activeGroupIndex}`;
}

export const getTasksArray = (scenarios: Scenario[], flowIndex: number, groupIndex: number): Task[] => {
    return scenarios.map((scenario) => {
        let taskId = `task-flow${flowIndex}-sg${groupIndex}-f${scenario.featureIndex}-s${scenario.scenarioIndex}`
        return {
            id: taskId,
            data: scenario,
            retriesRemaining: MAX_ATTEMPTS_PER_TASK - 1,
        }
    });
}

export const parsePodId = (podId: string): { executionId: string, flowIndex: number, groupIndex: number, workerNumber: number } => {
    //? strcuture is execId.flowX.sgY.wZ
    const parts = podId.split('.');
    if (parts.length !== 4) {
        throw new Error(`Invalid podId format: ${podId}`);
    }
    const executionId = parts[0];
    const flowIndex = parseInt(parts[1].replace('flow', ''));
    const groupIndex = parseInt(parts[2].replace('sg', ''));
    const workerNumber = parseInt(parts[3].replace('w', ''));
    return { executionId, flowIndex, groupIndex, workerNumber };
}