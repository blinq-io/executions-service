import dotenv from 'dotenv';
dotenv.config(); 
import app from './app';
import { connectDB } from './config/db';

const PORT = Number(process.env.EXPRESS_SERVER_PORT) || 5000;

connectDB().then(() => {
  app.listen(PORT,  () => console.log(`🚀 Server running on port ${PORT}`));
});
