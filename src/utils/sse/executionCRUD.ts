//? The stream is set up to send updates to the client whenever there are changes in the execution data.
//TODO Later
import { Response } from 'express';
import executionModel from '../../models/execution.model';

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
    if(process.env.projectId === undefined) {
      console.error('❌ projectId is undefined, cannot update stream');
      return;
    }
    const executions = await executionModel.find({projectId: process.env.projectId});
    console.log('🚀 Sending update via stream');

    clients.forEach((hook) => {
      if (hook.writableEnded || hook.headersSent === false) {
        console.warn('⚠️ Skipping client, connection is closed or invalid');
      } else {
        hook.write(`data: ${JSON.stringify(executions)}\n\n`);
      }
    });

    console.log('✅ Update sent via stream');
  } catch (err) {
    console.error('❌ Failed to fetch executions for SSE:', err);
  }
}