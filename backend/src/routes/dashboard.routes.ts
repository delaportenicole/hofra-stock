import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { authMiddleware, requirePermission } from '../middlewares/auth.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);
router.use(requirePermission('dashboard', 'leer'));

// Dashboard endpoints
router.get('/', dashboardController.getAll);
router.get('/stats', dashboardController.getStats);
router.get('/movimientos-recientes', dashboardController.getMovimientosRecientes);
router.get('/articulos-stock-bajo', dashboardController.getArticulosStockBajo);
router.get('/valuacion-por-rubro', dashboardController.getValuacionPorRubro);
router.get('/movimientos-por-mes', dashboardController.getMovimientosPorMes);

export { router as dashboardRoutes };
