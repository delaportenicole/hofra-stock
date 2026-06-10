import { Router } from 'express';
import { presentacionController } from '../controllers/presentacion.controller.js';
import { authMiddleware } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validation.js';
import { createPresentacionSchema, updatePresentacionSchema } from '@hofra/shared';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// List and read
router.get('/', presentacionController.findAll);
router.get('/active', presentacionController.findActive);
router.get('/:id', presentacionController.findById);

// Create
router.post('/', validateBody(createPresentacionSchema), presentacionController.create);

// Update
router.put('/:id', validateBody(updatePresentacionSchema), presentacionController.update);
router.patch('/:id', validateBody(updatePresentacionSchema), presentacionController.update);

// Delete
router.delete('/:id', presentacionController.delete);

export { router as presentacionRoutes };
