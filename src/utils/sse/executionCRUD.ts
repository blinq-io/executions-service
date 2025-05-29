import executionModel from '../../models/execution.model';
import { io } from '../../app'; // Or wherever your `io` instance is exported

export async function streamUpdateToClients() {
  try {
    if (process.env.projectId === undefined) {
      console.error('❌ projectId is undefined, cannot update stream');
      return;
    }

    const executions = await executionModel.find({ projectId: process.env.projectId });
    console.log('🚀 Sending update via WebSocket');

    // Emit to all frontend clients subscribed to the "execution-crud" room
    io.to('execution-crud').emit('crudUpdate', executions);

    console.log('✅ Update sent via WebSocket');
  } catch (err) {
    console.error('❌ Failed to fetch executions for socket.io stream:', err);
  }
}
