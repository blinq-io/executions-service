import app from './app';
import { connectDB } from './config/db';
import { streamUpdateToClients } from './utils/sse/executionStatus';

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT,  () => console.log(`🚀 Server running on port ${PORT}`));
});
