import { Router } from 'express';
import { usuarioController } from '../controllers/usuario.controller.js';
import { authMiddleware, requirePermission } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validation.js';
import { createUsuarioSchema, updateUsuarioSchema, passwordSchema } from '@hofra/shared';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

// List and read
router.get('/', requirePermission('usuarios', 'leer'), usuarioController.findAll);
router.get('/:id', requirePermission('usuarios', 'leer'), usuarioController.findById);

// Create
router.post('/', requirePermission('usuarios', 'crear'), validateBody(createUsuarioSchema), usuarioController.create);

// Update
router.put('/:id', requirePermission('usuarios', 'actualizar'), validateBody(updateUsuarioSchema), usuarioController.update);
router.patch('/:id', requirePermission('usuarios', 'actualizar'), validateBody(updateUsuarioSchema), usuarioController.update);

// Reset password
router.post('/:id/reset-password', requirePermission('usuarios', 'actualizar'), validateBody(resetPasswordSchema), usuarioController.resetPassword);

// Delete
router.delete('/:id', requirePermission('usuarios', 'eliminar'), usuarioController.delete);

export { router as usuarioRoutes };
