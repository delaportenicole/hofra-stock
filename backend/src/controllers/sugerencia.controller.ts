import type { Response, NextFunction } from 'express';
import { sugerenciaService } from '../services/sugerencia.service.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';

export class SugerenciaController {
  async findAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 20, estado, prioridad } = req.query;

      const result = await sugerenciaService.findAll({
        page: Number(page),
        limit: Number(limit),
        estado: estado as string | undefined,
        prioridad: prioridad as string | undefined,
      });

      sendPaginated(res, result.data, {
        page: Number(page),
        limit: Number(limit),
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sugerencia = await sugerenciaService.findById(req.params.id);
      sendSuccess(res, sugerencia);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sugerencia = await sugerenciaService.create(req.body, req.user?.userId);
      sendSuccess(res, sugerencia, 'Sugerencia creada exitosamente', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sugerencia = await sugerenciaService.update(req.params.id, req.body, req.user?.userId);
      sendSuccess(res, sugerencia, 'Sugerencia actualizada exitosamente');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await sugerenciaService.delete(req.params.id, req.user?.userId);
      sendSuccess(res, null, 'Sugerencia eliminada exitosamente');
    } catch (error) {
      next(error);
    }
  }
}

export const sugerenciaController = new SugerenciaController();
