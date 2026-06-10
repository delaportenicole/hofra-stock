import { Router } from 'express';
import { sugerenciaController } from '../controllers/sugerencia.controller.js';
import { authMiddleware } from '../middlewares/auth.js';
import { validateBody, validateParams } from '../middlewares/validation.js';
import { createSugerenciaSchema, updateSugerenciaSchema, uuidSchema } from '@hofra/shared';
import { z } from 'zod';

const router = Router();

const idParamSchema = z.object({ id: uuidSchema });

// All routes require authentication (but no specific permissions - open for all users)
router.use(authMiddleware);

// List all sugerencias
router.get(
  '/',
  sugerenciaController.findAll
);

// Get sugerencia by ID
router.get(
  '/:id',
  validateParams(idParamSchema),
  sugerenciaController.findById
);

// Create sugerencia
router.post(
  '/',
  validateBody(createSugerenciaSchema),
  sugerenciaController.create
);

// Update sugerencia
router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateSugerenciaSchema),
  sugerenciaController.update
);

// Delete sugerencia
router.delete(
  '/:id',
  validateParams(idParamSchema),
  sugerenciaController.delete
);

export { router as sugerenciaRoutes };
