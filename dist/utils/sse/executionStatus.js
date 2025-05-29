"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addNewStreamClient = addNewStreamClient;
exports.removeStreamClient = removeStreamClient;
exports.streamUpdateToClients = streamUpdateToClients;
const ExecutionRunnerRegistry_1 = require("../../classes/ExecutionRunnerRegistry");
let clients = [];
function addNewStreamClient(res) {
    // Add the new connection to the array
    clients.push(res);
}
function removeStreamClient(res) {
    // Remove the closed connection from the array
    clients = clients.filter((hook) => hook !== res);
}
async function streamUpdateToClients() {
    if (clients.length === 0) {
        console.warn('⚠️ No active SSE clients to send updates to');
        return;
    }
    try {
        if (process.env.projectId === undefined) {
            console.error('❌ projectId is undefined, cannot update stream');
            return;
        }
        const executions = [];
        for (const [id, runner] of ExecutionRunnerRegistry_1.executionRunnerRegistry.runners.entries()) {
            if (runner.execution.projectId === process.env.projectId) {
                executions.push(runner.execution);
            }
        }
        const stats = executions.filter(execution => execution.running).map((e) => e._id.toString()).map((id) => ExecutionRunnerRegistry_1.executionRunnerRegistry.get(id)).filter((runner) => runner !== undefined).map((runner) => runner.executionStatus);
        console.log('🔍 Active executions found:', stats);
        console.log('🚀 Sending execution status update via stream');
        clients.forEach((hook) => {
            if (hook.writableEnded || hook.headersSent === false) {
                console.warn('⚠️ Skipping client, connection is closed or invalid');
            }
            else {
                hook.write(`data: ${JSON.stringify(stats)}\n\n`);
            }
        });
        console.log('✅ Execution status update sent via stream');
    }
    catch (err) {
        console.error('❌ Failed to fetch executions for SSE:', err);
    }
}
