import { Router } from 'express';
import { stockController } from '../controllers/stock.controller.js';
import { authMiddleware, requirePermission } from '../middlewares/auth.js';
import { auditMiddleware } from '../middlewares/audit.js';
import { validateBody } from '../middlewares/validation.js';
import { createReposicionSchema, updateReposicionSchema, createEntregaSchema, updateEntregaSchema } from '@hofra/shared';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Reposiciones - with audit
router.get('/reposiciones', requirePermission('reposiciones', 'leer'), stockController.findAllReposiciones);
router.get('/reposiciones/:id', requirePermission('reposiciones', 'leer'), stockController.findReposicionById);
router.get('/reposiciones/:id/historial', requirePermission('reposiciones', 'leer'), stockController.getReposicionHistorial);
router.post('/reposiciones', requirePermission('reposiciones', 'crear'), auditMiddleware('reposiciones'), validateBody(createReposicionSchema), stockController.createReposicion);
router.put('/reposiciones/:id', requirePermission('reposiciones', 'actualizar'), auditMiddleware('reposiciones'), validateBody(updateReposicionSchema), stockController.updateReposicion);
// confirm/cancel use manual audit in controller
router.post('/reposiciones/:id/confirmar', requirePermission('reposiciones', 'actualizar'), stockController.confirmReposicion);
router.post('/reposiciones/:id/cancelar', requirePermission('reposiciones', 'actualizar'), stockController.cancelReposicion);

// Entregas - with audit
router.get('/entregas', requirePermission('entregas', 'leer'), stockController.findAllEntregas);
router.get('/entregas/:id', requirePermission('entregas', 'leer'), stockController.findEntregaById);
router.post('/entregas', requirePermission('entregas', 'crear'), auditMiddleware('entregas'), validateBody(createEntregaSchema), stockController.createEntrega);
router.put('/entregas/:id', requirePermission('entregas', 'actualizar'), auditMiddleware('entregas'), validateBody(updateEntregaSchema), stockController.updateEntrega);
// confirm/cancel use manual audit in controller
router.post('/entregas/:id/confirmar', requirePermission('entregas', 'actualizar'), stockController.confirmEntrega);
router.post('/entregas/:id/cancelar', requirePermission('entregas', 'actualizar'), stockController.cancelEntrega);

export { router as stockRoutes };
