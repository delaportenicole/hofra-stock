import { Router } from 'express';
import { solicitudCotizacionController } from '../controllers/solicitudCotizacion.controller.js';
import { authMiddleware, requirePermission } from '../middlewares/auth.js';
import { auditMiddleware } from '../middlewares/audit.js';
import { validateBody } from '../middlewares/validation.js';
import {
  createSolicitudCotizacionSchema,
  updateSolicitudCotizacionSchema,
  updateSolicitudCotizacionItemSchema,
} from '@hofra/shared';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', requirePermission('solicitudes_cotizacion', 'leer'), solicitudCotizacionController.findAll);
router.get('/:id', requirePermission('solicitudes_cotizacion', 'leer'), solicitudCotizacionController.findById);
router.get('/:id/exportar-excel', requirePermission('solicitudes_cotizacion', 'leer'), solicitudCotizacionController.exportarExcel);
router.post('/:id/exportar-google-sheets', requirePermission('solicitudes_cotizacion', 'leer'), solicitudCotizacionController.exportarGoogleSheets);
router.post(
  '/',
  requirePermission('solicitudes_cotizacion', 'crear'),
  auditMiddleware('solicitudes_cotizacion'),
  validateBody(createSolicitudCotizacionSchema),
  solicitudCotizacionController.create
);
router.put(
  '/:id',
  requirePermission('solicitudes_cotizacion', 'actualizar'),
  auditMiddleware('solicitudes_cotizacion'),
  validateBody(updateSolicitudCotizacionSchema),
  solicitudCotizacionController.update
);
router.put(
  '/:id/items/:itemId',
  requirePermission('solicitudes_cotizacion', 'actualizar'),
  validateBody(updateSolicitudCotizacionItemSchema),
  solicitudCotizacionController.updateItem
);
// marcar-cotizada/cancelar use manual audit in controller
router.post('/:id/marcar-cotizada', requirePermission('solicitudes_cotizacion', 'actualizar'), solicitudCotizacionController.marcarCotizada);
router.post('/:id/cancelar', requirePermission('solicitudes_cotizacion', 'actualizar'), solicitudCotizacionController.cancelar);

export { router as solicitudCotizacionRoutes };
