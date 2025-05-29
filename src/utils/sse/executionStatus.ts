import { io } from '../../app';
import { executionRunnerRegistry } from '../../classes/ExecutionRunnerRegistry';
import { ExecutionStatus } from '../../models/execution.model';

export async function updateRunnerStatus(execId: string, projectId: string, update: ExecutionStatus) {
    try {
        if (!projectId || !execId || !update) {
            return;
        }
        io.to(`execution-status:${projectId}`).emit(`statusUpdate:${execId}`, update);

    } catch (err) {
        console.error('❌ Failed to send updated executions status via socket.io:', err);
    }
}

export async function sendLatestStatusDataToNewClient(socket: any, projectId: string) {
    try {
        if (!projectId) {
            return;
        }

        for (const [id, runner] of executionRunnerRegistry.runners.entries()) {
            if (runner.execution.projectId === projectId) {
                const latestStatus = runner.executionStatus;
                if (latestStatus) {
                    socket.emit(`statusUpdate:${id}`, latestStatus);
                }
            }
        }
    } catch (err) {
        console.error('❌ Failed to send latest status data to new client:', err);
    }
}
