import type { Request, Response, NextFunction } from 'express';
import { proveedorService } from '../services/proveedor.service.js';
import { stockService } from '../services/stock.service.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { paginationSchema } from '@hofra/shared';

export class ProveedorController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, sortBy, sortOrder } = paginationSchema.parse(req.query);
      const result = await proveedorService.findAll({ page, limit, sortBy, sortOrder });

      sendPaginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async findActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proveedores = await proveedorService.findActive();
      sendSuccess(res, proveedores);
    } catch (error) {
      next(error);
    }
  }

  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q } = req.query;
      const { page, limit } = paginationSchema.parse(req.query);

      if (!q || typeof q !== 'string') {
        const result = await proveedorService.findAll({ page, limit });
        sendPaginated(res, result.data, result.pagination);
        return;
      }

      const result = await proveedorService.search(q, { page, limit });
      sendPaginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proveedor = await proveedorService.findById(req.params.id);
      sendSuccess(res, proveedor);
    } catch (error) {
      next(error);
    }
  }

  async getReposiciones(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      const result = await stockService.findReposicionesByProveedor(req.params.id, { page, limit });
      sendPaginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const proveedor = await proveedorService.create(req.body, req.user?.userId);
      sendCreated(res, proveedor, 'Proveedor creado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const proveedor = await proveedorService.update(req.params.id, req.body, req.user?.userId);
      sendSuccess(res, proveedor, 'Proveedor actualizado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await proveedorService.delete(req.params.id, req.user?.userId);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const proveedorController = new ProveedorController();
