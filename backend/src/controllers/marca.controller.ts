import type { Response, NextFunction } from 'express';
import { marcaService } from '../services/marca.service.js';
import { sendSuccess, sendPaginated, sendCreated, sendNoContent } from '../utils/response.js';
import { paginationSchema, createMarcaSchema, updateMarcaSchema } from '@hofra/shared';
import type { AuthenticatedRequest } from '../types/index.js';

export class MarcaController {
  async findAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, sortBy, sortOrder } = paginationSchema.parse(req.query);
      const result = await marcaService.findAll({ page, limit, sortBy, sortOrder });
      sendPaginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const marca = await marcaService.findById(req.params.id);
      sendSuccess(res, marca);
    } catch (error) {
      next(error);
    }
  }

  async getActive(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const marcas = await marcaService.getActive();
      sendSuccess(res, marcas);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createMarcaSchema.parse(req.body);
      const marca = await marcaService.create(data, req.user?.userId);
      sendCreated(res, marca);
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateMarcaSchema.parse(req.body);
      const marca = await marcaService.update(req.params.id, data, req.user?.userId);
      sendSuccess(res, marca);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await marcaService.delete(req.params.id, req.user?.userId);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async findOrCreate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nombre } = req.body;
      if (!nombre || typeof nombre !== 'string' || nombre.length < 2) {
        res.status(400).json({ success: false, message: 'El nombre es requerido (mínimo 2 caracteres)' });
        return;
      }
      const marca = await marcaService.findOrCreate(nombre.trim(), req.user?.userId);
      sendSuccess(res, marca);
    } catch (error) {
      next(error);
    }
  }
}

export const marcaController = new MarcaController();
