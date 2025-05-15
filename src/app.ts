import express from 'express';
import cors from 'cors';
import executionRoutes from './routes/execution.routes';
import { Server } from 'socket.io';
import { createServer } from 'http';
import logger from './utils/logger';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
cors: {
        origin: '*',    //! update when deploying
    }
});

app.use(cors());
app.use(express.json());
app.use('/api/executions', executionRoutes);

//? bind on all interfaces
httpServer.listen(5000, '0.0.0.0', () => logger.info('🚀 HTTP Server running on port 5000'));
export { io };

export default app;
