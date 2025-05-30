import express from 'express';
import cors from 'cors';
import executionRoutes from './routes/execution.routes';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { setupGlobalSocketHandlers } from './sockets';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/executions', (req, res, next) => {
  // prevent collisions with WebSocket route
  console.log('🔥 req.path is', req.path)
  if (req.path.startsWith('/ws')) return next('route');
  console.log(`🚀 [ExecutionRoutes] ${req.method} ${req.originalUrl}`);
  next();
}, executionRoutes);

// ⚠️ Do NOT mount `io` until AFTER Express setup
const httpServer = createServer(app);
const io = new Server(httpServer, {
  path: '/api/executions/ws',
  cors: {
    origin: '*', // For development, restrict later
  },
});

setupGlobalSocketHandlers(io);

const PORT = Number(process.env.SOCKET_PORT) || 5003;
httpServer.listen(PORT, '0.0.0.0', () =>
  console.log('🚀 WS Server running on port', PORT)
);

export { io };
export default app;
