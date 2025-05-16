//? Tried to implement a server-sent events (SSE) stream for real-time updates.
//? but it seems to be a bit tricky with Express and Socket.IO.
//? The stream is set up to send updates to the client whenever there are changes in the execution data.
//TODO Later
import { Response } from 'express';
import executionModel from '../models/execution.model';

let stream_hooks: Response[] = [];

export function setStreamHook(res: Response) {
  // Add the new connection to the array
  stream_hooks.push(res);
}

export function clearStreamHook(res: Response) {
  // Remove the closed connection from the array
  stream_hooks = stream_hooks.filter((hook) => hook !== res);
}



export async function updateStream() {
  if (stream_hooks.length === 0) {
    console.warn('⚠️ No active SSE clients to send updates to');
    return;
  }
  try {
    if(process.env.projectId === undefined) {
      console.error('❌ projectId is undefined, cannot update stream');
      return;
    }
    const executions = await executionModel.find({projectId: process.env.projectId});
    console.log('🚀 Sending update via stream', JSON.stringify(executions, null, 2));

    stream_hooks.forEach((hook) => {
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