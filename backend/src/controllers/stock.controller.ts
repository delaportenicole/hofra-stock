import type { Request, Response, NextFunction } from 'express';
import { stockService } from '../services/stock.service.js';
import { auditLogService } from '../services/auditLog.service.js';
import { logManualAudit } from '../middlewares/audit.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { paginationSchema } from '@hofra/shared';

export class StockController {
  // ============================================
  // REPOSICIONES
  // ============================================

  async findAllReposiciones(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, sortOrder } = paginationSchema.parse(req.query);
      const busqueda = typeof req.query.busqueda === 'string' ? req.query.busqueda : undefined;
      const result = await stockService.findAllReposiciones({ page, limit, sortOrder, busqueda });

      sendPaginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async findReposicionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reposicion = await stockService.findReposicionById(req.params.id);
      sendSuccess(res, reposicion);
    } catch (error) {
      next(error);
    }
  }

  async createReposicion(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reposicion = await stockService.createReposicion(req.body, req.user?.userId);
      // Audit is handled by middleware
      sendCreated(res, reposicion, 'Reposicion creada correctamente');
    } catch (error) {
      next(error);
    }
  }

  async updateReposicion(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const reposicion = await stockService.updateReposicion(req.params.id, req.body, req.user?.userId);
      // Audit is handled by middleware (captures previous and new data)
      sendSuccess(res, reposicion, 'Reposicion actualizada correctamente');
    } catch (error) {
      next(error);
    }
  }

  async confirmReposicion(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get old data to capture estado anterior
      const oldData = await stockService.findReposicionById(req.params.id);

      const reposicion = await stockService.confirmReposicion(req.params.id, req.user?.userId);

      // Manual audit for state change operation
      await logManualAudit(
        req,
        'actualizar',
        'reposiciones',
        req.params.id,
        {
          estado: oldData.estado,
          stockDisponible: 0
        },
        {
          estado: 'confirmada',
          stockDisponible: oldData.cantidad,
          stockIncrementado: oldData.cantidad
        }
      );

      sendSuccess(res, reposicion, 'Reposicion confirmada correctamente');
    } catch (error) {
      next(error);
    }
  }

  async cancelReposicion(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get old data to capture estado anterior
      const oldData = await stockService.findReposicionById(req.params.id);

      const reposicion = await stockService.cancelReposicion(req.params.id, req.user?.userId);

      const stockDescontado = oldData.estado === 'confirmada' ? oldData.cantidad : 0;

      // Manual audit for state change operation
      await logManualAudit(
        req,
        'actualizar',
        'reposiciones',
        req.params.id,
        {
          estado: oldData.estado,
          stockDisponible: oldData.estado === 'confirmada' ? oldData.stockDisponible : 0
        },
        {
          estado: 'cancelada',
          stockDisponible: 0,
          stockDescontado
        }
      );

      sendSuccess(res, reposicion, 'Reposicion cancelada correctamente');
    } catch (error) {
      next(error);
    }
  }

  async getReposicionHistorial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const historial = await auditLogService.findByEntidadId('reposiciones', req.params.id);
      sendSuccess(res, historial);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ENTREGAS
  // ============================================

  async findAllEntregas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, sortOrder } = paginationSchema.parse(req.query);
      const result = await stockService.findAllEntregas({ page, limit, sortOrder });

      sendPaginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async findEntregaById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const entrega = await stockService.findEntregaById(req.params.id);
      sendSuccess(res, entrega);
    } catch (error) {
      next(error);
    }
  }

  async createEntrega(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const entrega = await stockService.createEntrega(req.body, req.user?.userId);
      // Audit is handled by middleware
      sendCreated(res, entrega, 'Entrega creada correctamente');
    } catch (error) {
      next(error);
    }
  }

  async updateEntrega(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const entrega = await stockService.updateEntrega(req.params.id, req.body, req.user?.userId);
      // Audit is handled by middleware
      sendSuccess(res, entrega, 'Entrega actualizada correctamente');
    } catch (error) {
      next(error);
    }
  }

  async confirmEntrega(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get old data to capture estado anterior
      const oldData = await stockService.findEntregaById(req.params.id);

      const entrega = await stockService.confirmEntrega(req.params.id, req.user?.userId);

      // Calculate total quantity delivered
      const cantidadTotal = oldData.items.reduce((sum, item) => sum + item.cantidad, 0);

      // Manual audit for state change operation
      await logManualAudit(
        req,
        'actualizar',
        'entregas',
        req.params.id,
        {
          estado: oldData.estado
        },
        {
          estado: 'confirmada',
          stockDescontado: cantidadTotal
        }
      );

      sendSuccess(res, entrega, 'Entrega confirmada correctamente');
    } catch (error) {
      next(error);
    }
  }

  async cancelEntrega(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get old data to capture estado anterior
      const oldData = await stockService.findEntregaById(req.params.id);

      const entrega = await stockService.cancelEntrega(req.params.id, req.user?.userId);

      // Calculate total quantity
      const cantidadTotal = oldData.items.reduce((sum, item) => sum + item.cantidad, 0);
      const stockRestaurado = oldData.estado === 'confirmada' ? cantidadTotal : 0;

      // Manual audit for state change operation
      await logManualAudit(
        req,
        'actualizar',
        'entregas',
        req.params.id,
        {
          estado: oldData.estado
        },
        {
          estado: 'cancelada',
          stockRestaurado
        }
      );

      sendSuccess(res, entrega, 'Entrega cancelada correctamente');
    } catch (error) {
      next(error);
    }
  }
}

export const stockController = new StockController();
