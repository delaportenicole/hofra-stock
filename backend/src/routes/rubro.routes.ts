import { Router } from 'express';
import { rubroController } from '../controllers/rubro.controller.js';
import { authMiddleware, requirePermission } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validation.js';
import { createRubroSchema, updateRubroSchema } from '@hofra/shared';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// List and read
router.get('/', requirePermission('rubros', 'leer'), rubroController.findAll);
router.get('/active', requirePermission('rubros', 'leer'), rubroController.findActive);
router.get('/:id', requirePermission('rubros', 'leer'), rubroController.findById);

// Create
router.post('/', requirePermission('rubros', 'crear'), validateBody(createRubroSchema), rubroController.create);

// Update
router.put('/:id', requirePermission('rubros', 'actualizar'), validateBody(updateRubroSchema), rubroController.update);
router.patch('/:id', requirePermission('rubros', 'actualizar'), validateBody(updateRubroSchema), rubroController.update);

// Delete
router.delete('/:id', requirePermission('rubros', 'eliminar'), rubroController.delete);

export { router as rubroRoutes };
