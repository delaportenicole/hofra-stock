import type { Request, Response, NextFunction } from 'express';
import { unidadMedidaService } from '../services/unidadMedida.service.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { paginationSchema } from '@hofra/shared';

export class UnidadMedidaController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, sortBy, sortOrder } = paginationSchema.parse(req.query);
      const result = await unidadMedidaService.getAll({ page, limit, sortBy, sortOrder });

      sendPaginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async findActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const unidades = await unidadMedidaService.getActive();
      sendSuccess(res, unidades);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const unidad = await unidadMedidaService.getById(req.params.id);
      sendSuccess(res, unidad);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const unidad = await unidadMedidaService.create(req.body, req.user?.userId);
      sendCreated(res, unidad, 'Unidad de medida creada correctamente');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const unidad = await unidadMedidaService.update(req.params.id, req.body, req.user?.userId);
      sendSuccess(res, unidad, 'Unidad de medida actualizada correctamente');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await unidadMedidaService.delete(req.params.id, req.user?.userId);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const unidadMedidaController = new UnidadMedidaController();
