import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { createAuditLog } from '../middlewares/audit.js';
import { sendSuccess } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);

      // Audit log
      await createAuditLog(req as AuthenticatedRequest, {
        accion: 'login',
        entidad: 'usuarios',
        entidadId: result.usuario.id,
      });

      sendSuccess(res, result, 'Inicio de sesión exitoso');
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshToken(refreshToken);

      sendSuccess(res, tokens);
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);

      // Audit log
      await createAuditLog(req as AuthenticatedRequest, {
        accion: 'logout',
        entidad: 'usuarios',
        entidadId: (req as AuthenticatedRequest).user?.userId,
      });

      sendSuccess(res, null, 'Sesión cerrada correctamente');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user!.userId, currentPassword, newPassword);

      sendSuccess(res, null, 'Contraseña actualizada correctamente');
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await authService.getProfile(req.user!.userId);
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
