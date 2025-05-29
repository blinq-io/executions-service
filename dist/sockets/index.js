"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupGlobalSocketHandlers = setupGlobalSocketHandlers;
const execData_1 = require("../utils/execData");
const ExecutionRunnerRegistry_1 = require("../classes/ExecutionRunnerRegistry");
function setupGlobalSocketHandlers(io) {
    io.on('connection', (socket) => {
        const podId = socket.handshake.query.podId;
        if (!podId) {
            console.warn('❌ Pod connected without podId');
            socket.disconnect();
            return;
        }
        let parsed;
        try {
            parsed = (0, execData_1.parsePodId)(podId);
        }
        catch (e) {
            console.warn(`❌ Invalid podId: ${podId}`);
            socket.disconnect();
            return;
        }
        const { flowIndex, groupIndex, executionId, workerNumber, } = parsed;
        const runner = ExecutionRunnerRegistry_1.executionRunnerRegistry.get(executionId);
        if (!runner) {
            console.warn(`❌ No execution runner found for execution ${executionId}`);
            socket.disconnect();
            return;
        }
        //? Delegating the connection to the correct ExecutionRunner
        runner.handlePodConnection(socket, parsed);
    });
}
