import type { Request, Response, NextFunction } from 'express';
import { rolService } from '../services/rol.service.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { paginationSchema } from '@hofra/shared';

export class RolController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, sortBy, sortOrder } = paginationSchema.parse(req.query);
      const result = await rolService.findAll({ page, limit, sortBy, sortOrder });

      sendPaginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async findAllWithPermisos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roles = await rolService.findAllWithPermisos();
      sendSuccess(res, roles);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rol = await rolService.findById(req.params.id);
      sendSuccess(res, rol);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rol = await rolService.create(req.body, req.user?.userId);
      sendCreated(res, rol, 'Rol creado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rol = await rolService.update(req.params.id, req.body, req.user?.userId);
      sendSuccess(res, rol, 'Rol actualizado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await rolService.delete(req.params.id, req.user?.userId);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async getPermisos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const permisos = await rolService.getAllPermisos();
      sendSuccess(res, permisos);
    } catch (error) {
      next(error);
    }
  }

  async getPermisosGrouped(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const permisos = await rolService.getPermisosGrouped();
      sendSuccess(res, permisos);
    } catch (error) {
      next(error);
    }
  }
}

export const rolController = new RolController();
