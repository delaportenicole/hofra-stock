import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { env, validateEnv } from './config/env.js';
import { apiRoutes } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/error.js';
import { testConnection } from './config/database.js';
import { UPLOADS_DIR } from './config/cloudinary.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Validate environment variables
validateEnv();

const app = express();

// Security middleware
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use((helmet as any).default ? (helmet as any).default() : helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for proper IP detection
app.set('trust proxy', 1);

// Serve uploaded files (local storage)
app.use('/uploads', express.static(UPLOADS_DIR));

// API routes
app.use('/api', apiRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (dbConnected) {
      console.log('Database connection successful');
    } else {
      console.warn('Database connection failed - some features may not work');
    }

    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Frontend URL: ${env.FRONTEND_URL}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
