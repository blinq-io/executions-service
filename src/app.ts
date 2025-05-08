import express from 'express';
import cors from 'cors';
import executionRoutes from './routes/execution.routes';
import { Server } from 'socket.io';
import { createServer } from 'http';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
cors: {
        origin: '*', // adjust as needed
    }
});

app.use(cors());
app.use(express.json());
app.use('/executions', executionRoutes);

// store a reference to io globally or via context
httpServer.listen(5000, () => console.log('🚀 HTTP Server running on port 5000'));
export { io };

export default app;
