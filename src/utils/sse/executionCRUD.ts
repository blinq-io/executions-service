import { io } from '../../app';
import executionModel from '../../models/execution.model';

export async function updateExecutionsOnCrud(projectId: string) {
  try {
    if (!projectId) {
      return;
    }
    const executions = await executionModel.find({ projectId });
    io.to(`execution-crud:${projectId}`).emit('crudUpdate', executions);
  } catch (err) {
    console.error('❌ Failed to send updated executions via socket.io:', err);
  }
}
