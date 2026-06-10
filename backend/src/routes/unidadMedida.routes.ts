import { Router } from 'express';
import { unidadMedidaController } from '../controllers/unidadMedida.controller.js';
import { authMiddleware } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validation.js';
import { createUnidadMedidaSchema, updateUnidadMedidaSchema } from '@hofra/shared';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// List and read
router.get('/', unidadMedidaController.findAll);
router.get('/active', unidadMedidaController.findActive);
router.get('/:id', unidadMedidaController.findById);

// Create
router.post('/', validateBody(createUnidadMedidaSchema), unidadMedidaController.create);

// Update
router.put('/:id', validateBody(updateUnidadMedidaSchema), unidadMedidaController.update);
router.patch('/:id', validateBody(updateUnidadMedidaSchema), unidadMedidaController.update);

// Delete
router.delete('/:id', unidadMedidaController.delete);

export { router as unidadMedidaRoutes };
