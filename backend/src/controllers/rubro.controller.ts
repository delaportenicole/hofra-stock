import type { Request, Response, NextFunction } from 'express';
import { rubroService } from '../services/rubro.service.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { paginationSchema } from '@hofra/shared';

export class RubroController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, sortBy, sortOrder } = paginationSchema.parse(req.query);
      const result = await rubroService.findAll({ page, limit, sortBy, sortOrder });

      sendPaginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async findActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rubros = await rubroService.findActive();
      sendSuccess(res, rubros);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rubro = await rubroService.findById(req.params.id);
      sendSuccess(res, rubro);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rubro = await rubroService.create(req.body, req.user?.userId);
      sendCreated(res, rubro, 'Rubro creado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rubro = await rubroService.update(req.params.id, req.body, req.user?.userId);
      sendSuccess(res, rubro, 'Rubro actualizado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await rubroService.delete(req.params.id, req.user?.userId);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const rubroController = new RubroController();
