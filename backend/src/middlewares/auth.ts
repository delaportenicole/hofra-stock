import type { Response, NextFunction } from 'express';
import { verifyAccessToken, hashToken } from '../utils/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { apiKeyRepository } from '../repositories/apiKey.repository.js';
import type { AuthenticatedRequest } from '../types/index.js';
import type { JwtPayload } from '@hofra/shared';

// Permite que un proceso externo (ej. Hofra AI Agent) se autentique con una API key fija
// en vez de un JWT de usuario humano. Arma el mismo shape de JwtPayload que ya consume
// requirePermission/auditMiddleware, así que el resto del pipeline no necesita cambios.
async function resolveApiKeyUser(apiKey: string): Promise<JwtPayload | null> {
  const record = await apiKeyRepository.findByHash(hashToken(apiKey));
  if (!record) return null;

  // No bloquea el request si falla (dato informativo, no crítico).
  apiKeyRepository.touchLastUsed(record.id).catch(() => {});

  return {
    userId: record.usuarioId,
    email: record.nombre,
    roles: ['api-key'],
    permisos: record.permisos,
  };
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      req.user = verifyAccessToken(token);
      next();
      return;
    }

    if (typeof apiKeyHeader === 'string' && apiKeyHeader) {
      const user = await resolveApiKeyUser(apiKeyHeader);
      if (!user) {
        throw new UnauthorizedError('API key inválida');
      }
      req.user = user;
      next();
      return;
    }

    throw new UnauthorizedError('Token no proporcionado');
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
