import type { Request, Response, NextFunction } from 'express';
import { usuarioService } from '../services/usuario.service.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { paginationSchema } from '@hofra/shared';

export class UsuarioController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, sortBy, sortOrder } = paginationSchema.parse(req.query);
      const result = await usuarioService.findAll({ page, limit, sortBy, sortOrder });

      sendPaginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const usuario = await usuarioService.findById(req.params.id);
      sendSuccess(res, usuario);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const usuario = await usuarioService.create(req.body, req.user?.userId);
      sendCreated(res, usuario, 'Usuario creado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const usuario = await usuarioService.update(
        req.params.id,
        req.body,
        req.user?.userId
      );
      sendSuccess(res, usuario, 'Usuario actualizado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await usuarioService.delete(req.params.id, req.user?.userId);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { newPassword } = req.body;
      await usuarioService.resetPassword(req.params.id, newPassword, req.user?.userId);
      sendSuccess(res, null, 'Contraseña restablecida correctamente');
    } catch (error) {
      next(error);
    }
  }
}

export const usuarioController = new UsuarioController();
