import { Response } from 'express';
import executionModel, { Execution } from '../../models/execution.model';
import { executionRunnerRegistry } from '../../classes/ExecutionRunnerRegistry';

let clients: Response[] = [];

export function addNewStreamClient(res: Response) {
    // Add the new connection to the array
    clients.push(res);
}

export function removeStreamClient(res: Response) {
    // Remove the closed connection from the array
    clients = clients.filter((hook) => hook !== res);
}

export async function streamUpdateToClients() {
    if (clients.length === 0) {
        console.warn('⚠️ No active SSE clients to send updates to');
        return;
    }
    try {
        if (process.env.projectId === undefined) {
            console.error('❌ projectId is undefined, cannot update stream');
            return;
        }

        const executions: Execution[] = [];

        for (const [id, runner] of executionRunnerRegistry.runners.entries()) {
            if (runner.execution.projectId === process.env.projectId) {
                executions.push(runner.execution);
            }
        }

        const stats = executions.filter(execution => execution.running).map((e) => e._id.toString()).map((id) => executionRunnerRegistry.get(id)).filter((runner) => runner !== undefined).map((runner) => runner.executionStatus);

        console.log('🔍 Active executions found:', stats);
        console.log('🚀 Sending execution status update via stream');

        clients.forEach((hook) => {
            if (hook.writableEnded || hook.headersSent === false) {
                console.warn('⚠️ Skipping client, connection is closed or invalid');
            } else {
                hook.write(`data: ${JSON.stringify(stats)}\n\n`);
            }
        });

        console.log('✅ Execution status update sent via stream');
    } catch (err) {
        console.error('❌ Failed to fetch executions for SSE:', err);
    }
}