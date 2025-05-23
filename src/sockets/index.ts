// src/sockets/index.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import { parsePodId, getFlowGroupKey } from '../utils/execData';
import { executionRunnerRegistry } from '../classes/ExecutionRunnerRegistry';
import logger from '../utils/logger';

export function setupGlobalSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    const podId = socket.handshake.query.podId as string;
    if (!podId) {
      console.warn('❌ Pod connected without podId');
      socket.disconnect();
      return;
    }

    let parsed;
    try {
      parsed = parsePodId(podId);
    } catch (e) {
      console.warn(`❌ Invalid podId: ${podId}`);
      socket.disconnect();
      return;
    }

    const {
      flowIndex,
      groupIndex,
      executionId,
      workerNumber,
    } = parsed;

    const runner = executionRunnerRegistry.get(executionId);
    if (!runner) {
      console.warn(`❌ No execution runner found for execution ${executionId}`);
      socket.disconnect();
      return;
    }

    //? Delegating the connection to the correct ExecutionRunner
    runner.handlePodConnection(socket, parsed);
  });
}
