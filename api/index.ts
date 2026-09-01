import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Import backend modules from the compiled output (not src/), so Vercel's function
// builder doesn't have to transpile the backend's TypeScript itself — it just loads
// the real .js files produced by our own `npm run build --workspace=backend` step.
import { apiRoutes } from '../backend/dist/routes/index.js';
import { errorHandler, notFoundHandler } from '../backend/dist/middlewares/error.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for proper IP detection
app.set('trust proxy', 1);

// API routes
app.use('/api', apiRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
