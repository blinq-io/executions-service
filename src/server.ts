import app from './app';
import { connectDB } from './config/db';

import logger from './utils/logger';

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT,  () => console.log(`🚀 Server running on port ${PORT}`));
});