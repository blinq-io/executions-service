// src/sockets/index.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import { parsePodId, getFlowGroupKey } from '../utils/execData';
import { executionRunnerRegistry } from '../classes/ExecutionRunnerRegistry';

export function setupGlobalSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    const podId = socket.handshake.query.podId as string;
    
    if (!podId) {
      console.log(`🧑‍💻 [Frontend] WebSocket connected: ${socket.id}`);

      socket.on('subscribeToExecutionCrud', (projectId: string) => {
        if (projectId) {
          socket.join('execution-crud:${projectId}`);');
        }
      });

      socket.on('subscribeToExecutionStatus', (projectId: string) => {
        if (projectId) {
          socket.join(`execution-status:${projectId}`);
        }
      });

      socket.on('disconnect', () => {
        console.log(`❌ [Frontend] WebSocket disconnected: ${socket.id}`);
      });
    } else {
      let parsed;
      try {
        parsed = parsePodId(podId);
      } catch (e) {
        console.warn(`❌ Invalid podId: ${podId}`);
        socket.disconnect();
        return;
      }

      const runner = executionRunnerRegistry.get(parsed.executionId);
      if (!runner) {
        console.warn(`❌ No execution runner found for execution ${parsed.executionId}`);
        socket.disconnect();
        return;
      }

      //? Delegating the connection to the correct ExecutionRunner
      runner.handlePodConnection(socket, parsed);
    }
  });
}
