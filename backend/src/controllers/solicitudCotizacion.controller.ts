import type { Request, Response, NextFunction } from 'express';
import { solicitudCotizacionService } from '../services/solicitudCotizacion.service.js';
import { buildCotizacionExcelBuffer } from '../services/cotizacionExport.service.js';
import { googleService } from '../services/google.service.js';
import { logManualAudit } from '../middlewares/audit.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { paginationSchema } from '@hofra/shared';
import type { EstadoSolicitudCotizacion } from '@hofra/shared';

export class SolicitudCotizacionController {
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, sortOrder } = paginationSchema.parse(req.query);
      const estado = typeof req.query.estado === 'string' ? (req.query.estado as EstadoSolicitudCotizacion) : undefined;
      const clienteId = typeof req.query.clienteId === 'string' ? req.query.clienteId : undefined;
      const busqueda = typeof req.query.busqueda === 'string' ? req.query.busqueda : undefined;

      const result = await solicitudCotizacionService.findAll(
        { estado, clienteId, busqueda },
        { page, limit, sortOrder }
      );

      sendPaginated(res, result.data, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const solicitud = await solicitudCotizacionService.findById(req.params.id);
      sendSuccess(res, solicitud);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const solicitud = await solicitudCotizacionService.create(req.body, req.user?.userId);
      // Audit is handled by middleware
      sendCreated(res, solicitud, 'Solicitud de cotización creada correctamente');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const solicitud = await solicitudCotizacionService.updateHeader(req.params.id, req.body, req.user?.userId);
      // Audit is handled by middleware
      sendSuccess(res, solicitud, 'Solicitud de cotización actualizada correctamente');
    } catch (error) {
      next(error);
    }
  }

  async updateItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const solicitud = await solicitudCotizacionService.updateItem(
        req.params.id,
        req.params.itemId,
        req.body
      );
      sendSuccess(res, solicitud, 'Ítem actualizado correctamente');
    } catch (error) {
      next(error);
    }
  }

  async marcarCotizada(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const oldData = await solicitudCotizacionService.findById(req.params.id);

      const solicitud = await solicitudCotizacionService.marcarCotizada(req.params.id, req.user?.userId);

      await logManualAudit(
        req,
        'actualizar',
        'solicitudes_cotizacion',
        req.params.id,
        { estado: oldData.estado },
        { estado: 'cotizada' }
      );

      sendSuccess(res, solicitud, 'Solicitud marcada como cotizada');
    } catch (error) {
      next(error);
    }
  }

  async exportarExcel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const solicitud = await solicitudCotizacionService.findById(req.params.id);
      const buffer = await buildCotizacionExcelBuffer(solicitud);

      const nombreArchivo = `Cotizacion - ${solicitud.cliente.razonSocial}${
        solicitud.numeroReferenciaCliente ? ` - ${solicitud.numeroReferenciaCliente}` : ''
      }.xlsx`.replace(/[/\\?%*:|"<>]/g, '-');

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async exportarGoogleSheets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const solicitud = await solicitudCotizacionService.findById(req.params.id);
      const url = await googleService.createSpreadsheet(solicitud);
      sendSuccess(res, { url });
    } catch (error) {
      next(error);
    }
  }

  async cancelar(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const oldData = await solicitudCotizacionService.findById(req.params.id);

      const solicitud = await solicitudCotizacionService.cancelar(req.params.id, req.user?.userId);

      await logManualAudit(
        req,
        'actualizar',
        'solicitudes_cotizacion',
        req.params.id,
        { estado: oldData.estado },
        { estado: 'cancelada' }
      );

      sendSuccess(res, solicitud, 'Solicitud cancelada correctamente');
    } catch (error) {
      next(error);
    }
  }
}

export const solicitudCotizacionController = new SolicitudCotizacionController();
