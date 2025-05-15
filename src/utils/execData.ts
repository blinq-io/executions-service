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