import type { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);

  // Handle our custom errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err instanceof ValidationError && { errors: err.errors }),
      ...(env.isDevelopment && { stack: err.stack }),
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    success: false,
    message: env.isProduction
      ? 'Error interno del servidor'
      : err.message,
    ...(env.isDevelopment && { stack: err.stack }),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.path}`,
  });
}
