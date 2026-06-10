import { Router } from 'express';
import { rolController } from '../controllers/rol.controller.js';
import { authMiddleware, requirePermission } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validation.js';
import { createRolSchema, updateRolSchema } from '@hofra/shared';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Permisos
router.get('/permisos', requirePermission('roles', 'leer'), rolController.getPermisos);
router.get('/permisos/grouped', requirePermission('roles', 'leer'), rolController.getPermisosGrouped);

// List and read
router.get('/', requirePermission('roles', 'leer'), rolController.findAll);
router.get('/with-permisos', requirePermission('roles', 'leer'), rolController.findAllWithPermisos);
router.get('/:id', requirePermission('roles', 'leer'), rolController.findById);

// Create
router.post('/', requirePermission('roles', 'crear'), validateBody(createRolSchema), rolController.create);

// Update
router.put('/:id', requirePermission('roles', 'actualizar'), validateBody(updateRolSchema), rolController.update);
router.patch('/:id', requirePermission('roles', 'actualizar'), validateBody(updateRolSchema), rolController.update);

// Delete
router.delete('/:id', requirePermission('roles', 'eliminar'), rolController.delete);

export { router as rolRoutes };
