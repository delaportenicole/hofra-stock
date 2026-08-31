import { Router } from 'express';
import { googleController } from '../controllers/google.controller.js';
import { authMiddleware, requirePermission } from '../middlewares/auth.js';

const router = Router();

// El callback lo llama Google directo (redirect de navegador), sin nuestro JWT
router.get('/oauth/callback', googleController.oauthCallback);

router.use(authMiddleware);
router.get('/status', googleController.getStatus);
router.get('/auth-url', requirePermission('solicitudes_cotizacion', 'actualizar'), googleController.getAuthUrl);

export { router as googleRoutes };
