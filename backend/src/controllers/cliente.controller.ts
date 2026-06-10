import type { Request, Response, NextFunction } from 'express';
import { clienteService } from '../services/cliente.service.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { paginationSchema } from '@hofra/shared';

export class ClienteController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, sortBy, sortOrder } = paginationSchema.parse(req.query);
      const result = await clienteService.findAll({ page, limit, sortBy, sortOrder });

      sendPaginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async findActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientes = await clienteService.findActive();
      sendSuccess(res, clientes);
    } catch (error) {
      next(error);
    }
  }

  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { q } = req.query;
      const { page, limit } = paginationSchema.parse(req.query);

      if (!q || typeof q !== 'string') {
        const result = await clienteService.findAll({ page, limit });
        sendPaginated(res, result.data, result.pagination);
        return;
      }

      const result = await clienteService.search(q, { page, limit });
      sendPaginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cliente = await clienteService.findById(req.params.id);
      sendSuccess(res, cliente);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cliente = await clienteService.create(req.body, req.user?.userId);
      sendCreated(res, cliente, 'Cliente creado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cliente = await clienteService.update(req.params.id, req.body, req.user?.userId);
      sendSuccess(res, cliente, 'Cliente actualizado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await clienteService.delete(req.params.id, req.user?.userId);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const clienteController = new ClienteController();
