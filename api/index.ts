import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { Express, Request, Response, NextFunction } from 'express';

// Este archivo se compila/empaqueta como CommonJS (el package.json de la raíz no
// tiene "type": "module"), pero el backend es un ES Module ("type": "module" en
// backend/package.json). Un CommonJS no puede hacer require() de un ES Module de
// forma síncrona (ERR_REQUIRE_ESM) — por eso el backend se carga con import()
// dinámico, cacheando la app ya armada entre invocaciones "calientes" de la función.
let appPromise: Promise<Express> | null = null;

async function buildApp(): Promise<Express> {
  const { apiRoutes } = await import('../backend/src/routes/index.js');
  const { errorHandler, notFoundHandler } = await import('../backend/src/middlewares/error.js');

  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.set('trust proxy', 1);

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default async function handler(req: Request, res: Response, next: NextFunction) {
  if (!appPromise) {
    appPromise = buildApp();
  }
  const app = await appPromise;
  return app(req, res, next);
}
