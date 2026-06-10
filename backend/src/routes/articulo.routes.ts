import { Router } from 'express';
import { articuloController } from '../controllers/articulo.controller.js';
import { authMiddleware, requirePermission } from '../middlewares/auth.js';
import { auditMiddleware } from '../middlewares/audit.js';
import { validateBody } from '../middlewares/validation.js';
import { uploadMiddleware } from '../middlewares/upload.js';
import { createArticuloSchema, updateArticuloSchema } from '@hofra/shared';

const router = Router();

// All routes require authentication
router.use(authMiddleware);
router.use(auditMiddleware('articulos'));

// List and read
router.get('/', requirePermission('articulos', 'leer'), articuloController.findAll);
router.get('/stock-bajo', requirePermission('articulos', 'leer'), articuloController.findStockBajo);
router.get('/generate-codigo', requirePermission('articulos', 'crear'), articuloController.generateCodigo);
router.get('/:id', requirePermission('articulos', 'leer'), articuloController.findById);
router.get('/:id/historial', requirePermission('articulos', 'leer'), articuloController.getHistorial);
router.get('/:id/valuacion', requirePermission('articulos', 'leer'), articuloController.getValuacion);

// Create
router.post('/', requirePermission('articulos', 'crear'), validateBody(createArticuloSchema), articuloController.create);

// Update
router.put('/:id', requirePermission('articulos', 'actualizar'), validateBody(updateArticuloSchema), articuloController.update);
router.patch('/:id', requirePermission('articulos', 'actualizar'), validateBody(updateArticuloSchema), articuloController.update);

// Image upload
router.post('/:id/imagen', requirePermission('articulos', 'actualizar'), uploadMiddleware.single('imagen'), articuloController.uploadImage);
router.delete('/:id/imagen', requirePermission('articulos', 'actualizar'), articuloController.deleteImage);

// Delete
router.delete('/:id', requirePermission('articulos', 'eliminar'), articuloController.delete);

export { router as articuloRoutes };
