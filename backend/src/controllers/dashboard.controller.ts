import type { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service.js';
import { sendSuccess } from '../utils/response.js';

export class DashboardController {
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await dashboardService.getStats();
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }

  async getMovimientosRecientes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const movimientos = await dashboardService.getMovimientosRecientes(limit);
      sendSuccess(res, movimientos);
    } catch (error) {
      next(error);
    }
  }

  async getArticulosStockBajo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const articulos = await dashboardService.getArticulosStockBajo(limit);
      sendSuccess(res, articulos);
    } catch (error) {
      next(error);
    }
  }

  async getStockPorRubro(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getStockPorRubro();
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getMovimientosPorMes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meses = parseInt(req.query.meses as string) || 6;
      const data = await dashboardService.getMovimientosPorMes(meses);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [stats, movimientosRecientes, articulosStockBajo, stockPorRubro, movimientosPorMes] =
        await Promise.all([
          dashboardService.getStats(),
          dashboardService.getMovimientosRecientes(10),
          dashboardService.getArticulosStockBajo(10),
          dashboardService.getStockPorRubro(),
          dashboardService.getMovimientosPorMes(6),
        ]);

      sendSuccess(res, {
        stats,
        movimientosRecientes,
        articulosStockBajo,
        stockPorRubro,
        movimientosPorMes,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
