import { Router } from 'express';
import { auditLogController } from '../controllers/auditLog.controller.js';
import { authMiddleware, requirePermission } from '../middlewares/auth.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);
router.use(requirePermission('auditoria', 'leer'));

// Audit log endpoints
router.get('/', auditLogController.findAll);
router.get('/filters', auditLogController.getFilters);
router.get('/conteo-por-usuario', auditLogController.conteoPorUsuario);

export { router as auditLogRoutes };
