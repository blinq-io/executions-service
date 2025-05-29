import express from 'express';
import cors from 'cors';
import executionRoutes from './routes/execution.routes';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { setupGlobalSocketHandlers } from './sockets';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
cors: {
        origin: '*',    //! update this when deploying
    }
});

app.use(cors());
app.use(express.json());
// app.use('/api/executions', executionRoutes);

app.use('/api/executions', (req, res, next) => {
    console.log(`🚀 [ExecutionRoutes] ${req.method} ${req.originalUrl}`);
    next();
  }, executionRoutes);

const PORT = 5003;

//? bind on all interfaces
httpServer.listen(PORT, '0.0.0.0', () => console.log('🚀 HTTP Server running on port', PORT));
setupGlobalSocketHandlers(io);
export { io };

export default app;
