import type { Request, Response, NextFunction } from 'express';
import { articuloService } from '../services/articulo.service.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { paginationSchema, articuloFiltrosSchema } from '@hofra/shared';

export class ArticuloController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, sortBy, sortOrder } = paginationSchema.parse(req.query);
      const filtros = articuloFiltrosSchema.parse(req.query);

      const result = await articuloService.search(filtros, { page, limit, sortBy, sortOrder });
      sendPaginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async findStockBajo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const articulos = await articuloService.findStockBajo(limit);
      sendSuccess(res, articulos);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const articulo = await articuloService.findById(req.params.id);
      sendSuccess(res, articulo);
    } catch (error) {
      next(error);
    }
  }

  async getHistorial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const historial = await articuloService.getHistorial(req.params.id, limit);
      sendSuccess(res, historial);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const articulo = await articuloService.create(req.body, req.user?.userId);
      sendCreated(res, articulo, 'Artículo creado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const articulo = await articuloService.update(req.params.id, req.body, req.user?.userId);
      sendSuccess(res, articulo, 'Artículo actualizado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await articuloService.delete(req.params.id, req.user?.userId);
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  async uploadImage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No se proporcionó ninguna imagen' });
        return;
      }

      const url = await articuloService.uploadImage(
        req.params.id,
        req.file.buffer,
        req.user?.userId
      );

      sendSuccess(res, { url }, 'Imagen subida correctamente');
    } catch (error) {
      next(error);
    }
  }

  async deleteImage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await articuloService.deleteImage(req.params.id, req.user?.userId);
      sendSuccess(res, null, 'Imagen eliminada correctamente');
    } catch (error) {
      next(error);
    }
  }

  async generateCodigo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { rubroId } = req.query;
      if (!rubroId || typeof rubroId !== 'string') {
        res.status(400).json({ success: false, message: 'Se requiere el rubroId' });
        return;
      }
      const codigo = await articuloService.generateCodigo(rubroId);
      sendSuccess(res, { codigo });
    } catch (error) {
      next(error);
    }
  }

  async getValuacion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const valuacion = await articuloService.getValuacion(req.params.id);
      sendSuccess(res, valuacion);
    } catch (error) {
      next(error);
    }
  }
}

export const articuloController = new ArticuloController();
