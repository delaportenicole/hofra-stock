import type { Request, Response, NextFunction } from 'express';
import { presentacionService } from '../services/presentacion.service.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { paginationSchema } from '@hofra/shared';

export class PresentacionController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, sortBy, sortOrder } = paginationSchema.parse(req.query);
      const result = await presentacionService.getAll({ page, limit, sortBy, sortOrder });

      sendPaginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async findActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const presentaciones = await presentacionService.getActive();
      sendSuccess(res, presentaciones);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const presentacion = await presentacionService.getById(req.params.id);
      sendSuccess(res, presentacion);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const presentacion = await presentacionService.create(req.body, req.user?.userId);
      sendCreated(res, presentacion, 'Presentación creada correctamente');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const presentacion = await presentacionService.update(req.params.id, req.body, req.user?.userId);
      sendSuccess(res, presentacion, 'Presentación actualizada correctamente');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await presentacionService.delete(req.params.id, req.user?.userId);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const presentacionController = new PresentacionController();
