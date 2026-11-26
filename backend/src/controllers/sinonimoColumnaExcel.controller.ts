import type { Response, NextFunction } from 'express';
import { sinonimoColumnaExcelService } from '../services/sinonimoColumnaExcel.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';

export class SinonimoColumnaExcelController {
  async findAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sinonimos = await sinonimoColumnaExcelService.findAll();
      sendSuccess(res, sinonimos);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const sinonimo = await sinonimoColumnaExcelService.create(req.body, req.user?.userId);
      sendCreated(res, sinonimo, 'Sinónimo agregado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await sinonimoColumnaExcelService.delete(req.params.id, req.user?.userId);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
}

export const sinonimoColumnaExcelController = new SinonimoColumnaExcelController();
