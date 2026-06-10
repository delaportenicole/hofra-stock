import type { Request, Response, NextFunction } from 'express';
import { auditLogService } from '../services/auditLog.service.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { paginationSchema, auditLogFiltrosSchema } from '@hofra/shared';

export class AuditLogController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, sortOrder } = paginationSchema.parse(req.query);
      const filtros = auditLogFiltrosSchema.parse(req.query);

      const result = await auditLogService.findAll(filtros, { page, limit, sortOrder });
      sendPaginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async getFilters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = await auditLogService.getFilters();
      sendSuccess(res, filters);
    } catch (error) {
      next(error);
    }
  }
}

export const auditLogController = new AuditLogController();
