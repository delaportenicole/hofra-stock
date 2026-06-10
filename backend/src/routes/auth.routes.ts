import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validation.js';
import { loginSchema, changePasswordSchema } from '@hofra/shared';
import { z } from 'zod';

const router = Router();

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido'),
});

// Public routes
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/refresh', validateBody(refreshTokenSchema), authController.refreshToken);

// Protected routes
router.post('/logout', authMiddleware, validateBody(refreshTokenSchema), authController.logout);
router.post('/change-password', authMiddleware, validateBody(changePasswordSchema), authController.changePassword);
router.get('/profile', authMiddleware, authController.getProfile);

export { router as authRoutes };
