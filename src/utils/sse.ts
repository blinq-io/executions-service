//? Tried to implement a server-sent events (SSE) stream for real-time updates.
//? but it seems to be a bit tricky with Express and Socket.IO.
//? The stream is set up to send updates to the client whenever there are changes in the execution data.
//TODO Later
import { Response } from 'express';
import executionModel from '../models/execution.model';

let stream_hook: Response | undefined;

export function setStreamHook(res: Response) {
  stream_hook = res;
}

export function clearStreamHook() {
  stream_hook = undefined;
}


export async function updateStream() {
  if (!stream_hook || stream_hook.writableEnded || stream_hook.headersSent === false) {
    console.warn('⚠️ No active SSE stream to write to');
    return;
  }

  try {
    const executions = await executionModel.find();
    console.log('🚀 Sending update via stream');
    stream_hook.write(`data: ${JSON.stringify(executions)}\n\n`);
    console.log('✅ Update sent via stream');
  } catch (err) {
    console.error('❌ Failed to fetch executions for SSE:', err);
  }
}