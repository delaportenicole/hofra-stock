import type { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import type { AuthenticatedRequest } from '../types/index.js';

export function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token no proporcionado');
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
      return;
    }

    // JWT errors
    const err = error as Error;
    if (err.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Sesión expirada. Por favor, inicie sesión nuevamente'));
      return;
    }
    if (err.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Token inválido'));
      return;
    }

    next(new UnauthorizedError('Error de autenticación'));
  }
}

export function requirePermission(modulo: string, accion: string) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    const permisoRequerido = `${modulo}:${accion}`;
    const tienePermiso = req.user.permisos.includes(permisoRequerido);

    if (!tienePermiso) {
      next(new ForbiddenError());
      return;
    }

    next();
  };
}

export function requireAnyPermission(permisos: Array<{ modulo: string; accion: string }>) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    const tieneAlgunPermiso = permisos.some(({ modulo, accion }) => {
      const permisoRequerido = `${modulo}:${accion}`;
      return req.user!.permisos.includes(permisoRequerido);
    });

    if (!tieneAlgunPermiso) {
      next(new ForbiddenError());
      return;
    }

    next();
  };
}

export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      req.user = verifyAccessToken(token);
    }
  } catch {
    // Ignore auth errors for optional auth
  }

  next();
}
