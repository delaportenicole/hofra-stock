import { Router } from 'express';
import { proveedorController } from '../controllers/proveedor.controller.js';
import { authMiddleware, requirePermission } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validation.js';
import { createProveedorSchema, updateProveedorSchema } from '@hofra/shared';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// List and read
router.get('/', requirePermission('proveedores', 'leer'), proveedorController.findAll);
router.get('/active', requirePermission('proveedores', 'leer'), proveedorController.findActive);
router.get('/search', requirePermission('proveedores', 'leer'), proveedorController.search);
router.get('/:id', requirePermission('proveedores', 'leer'), proveedorController.findById);
router.get('/:id/reposiciones', requirePermission('proveedores', 'leer'), proveedorController.getReposiciones);

// Create
router.post('/', requirePermission('proveedores', 'crear'), validateBody(createProveedorSchema), proveedorController.create);

// Update
router.put('/:id', requirePermission('proveedores', 'actualizar'), validateBody(updateProveedorSchema), proveedorController.update);
router.patch('/:id', requirePermission('proveedores', 'actualizar'), validateBody(updateProveedorSchema), proveedorController.update);

// Delete
router.delete('/:id', requirePermission('proveedores', 'eliminar'), proveedorController.delete);

export { router as proveedorRoutes };
