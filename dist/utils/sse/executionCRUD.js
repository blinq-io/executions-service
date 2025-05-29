"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addNewStreamClient = addNewStreamClient;
exports.removeStreamClient = removeStreamClient;
exports.streamUpdateToClients = streamUpdateToClients;
const execution_model_1 = __importDefault(require("../../models/execution.model"));
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
        const executions = await execution_model_1.default.find({ projectId: process.env.projectId });
        console.log('🚀 Sending update via stream');
        clients.forEach((hook) => {
            if (hook.writableEnded || hook.headersSent === false) {
                console.warn('⚠️ Skipping client, connection is closed or invalid');
            }
            else {
                hook.write(`data: ${JSON.stringify(executions)}\n\n`);
            }
        });
        console.log('✅ Update sent via stream');
    }
    catch (err) {
        console.error('❌ Failed to fetch executions for SSE:', err);
    }
}
