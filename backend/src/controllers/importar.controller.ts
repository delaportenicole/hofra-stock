import type { Response, NextFunction } from 'express';
import { importarService, type ImportArticuloRow } from '../services/importar.service.js';
import { sendSuccess } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';

class ImportarController {
  async preview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rows = req.body.rows as ImportArticuloRow[];

      if (!rows || !Array.isArray(rows)) {
        res.status(400).json({ success: false, message: 'Se requiere un array de filas' });
        return;
      }

      const result = await importarService.preview(rows);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async import(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rows = req.body.rows as ImportArticuloRow[];

      if (!rows || !Array.isArray(rows)) {
        res.status(400).json({ success: false, message: 'Se requiere un array de filas' });
        return;
      }

      const result = await importarService.import(rows, req.user?.userId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const importarController = new ImportarController();
