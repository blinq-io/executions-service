import { Scenario, Task } from "../models/execution.model";

// TODO
export const getActiveGroupIndex = (flowIndex: number) => {
    return 0;
}

export const getFlowGroupKey = (executionId: string, flowIndex: number, activeGroupIndex: number) => {
    return `${executionId}.flow${flowIndex}.sg${activeGroupIndex}`;
}

export const getTasksArray = (scenarios: Scenario[], flowIndex: number, groupIndex: number): Task[] => {
    return scenarios.map((scenario) => {
        let taskId = `task-flow${flowIndex}-sg${groupIndex}-f${scenario.featureIndex}-s${scenario.scenarioIndex}`
        return {
            id: taskId,
            data: {
                command: `pwd; echo "Running task ${taskId} with scenario ${scenario.featureIndex}-${scenario.scenarioIndex}"`,
                featureIndex: scenario.featureIndex,
                scenarioIndex: scenario.scenarioIndex,
            },
        }
    });
}