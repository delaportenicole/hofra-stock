import type { Response, NextFunction } from 'express';
import { reportesService } from '../services/reportes.service.js';
import { sendSuccess } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';

class ReportesController {
  async getEntregasPorCliente(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const mes = parseInt(req.query.mes as string) || new Date().getMonth() + 1;
      const anio = parseInt(req.query.anio as string) || new Date().getFullYear();

      const data = await reportesService.getEntregasPorCliente({ mes, anio });
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getReposicionesPorProveedor(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const mes = parseInt(req.query.mes as string) || new Date().getMonth() + 1;
      const anio = parseInt(req.query.anio as string) || new Date().getFullYear();

      const data = await reportesService.getReposicionesPorProveedor({ mes, anio });
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getProveedoresPorArticulo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportesService.getProveedoresPorArticulo();
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getArticulosPorProveedor(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportesService.getArticulosPorProveedor();
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getResumenMensual(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const anio = parseInt(req.query.anio as string) || new Date().getFullYear();
      const data = await reportesService.getResumenMensual(anio);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }
}

export const reportesController = new ReportesController();
