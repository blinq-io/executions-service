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

export const injectRunIdInScenarios = (scenarios: Scenario[], runId: string, projectId: string): Scenario[] => {
    return scenarios.map((scenario) => {
        //? let command = "npx cross-env NODE_ENV_BLINQ=stage BLINQ_ENV='environments/google2.json' TOKEN=2f474b397dcc1b898e958d1b7de926f6 HEADLESS='true' cucumber-js --format bvt --name 'Search for javascript' 'features/Search functionality.feature'";
        
        let command = scenario.command.split(' ');
        const index = command.indexOf("HEADLESS='true'");
        command.splice(index + 1, 0, `RUN_ID=${runId}`, `PROJECT_ID=${projectId}`);
        
        scenario.command = command.join(' ');

        return scenario;
    })
}