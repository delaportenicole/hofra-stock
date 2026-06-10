import { Router } from 'express';
import { reportesController } from '../controllers/reportes.controller.js';
import { authMiddleware, requirePermission } from '../middlewares/auth.js';

const router = Router();

// All routes require authentication and reportes:leer permission
router.use(authMiddleware);
router.use(requirePermission('reportes', 'leer'));

// GET /api/reportes/entregas-por-cliente?mes=6&anio=2026
router.get('/entregas-por-cliente', reportesController.getEntregasPorCliente);

// GET /api/reportes/reposiciones-por-proveedor?mes=6&anio=2026
router.get('/reposiciones-por-proveedor', reportesController.getReposicionesPorProveedor);

// GET /api/reportes/proveedores-por-articulo
router.get('/proveedores-por-articulo', reportesController.getProveedoresPorArticulo);

// GET /api/reportes/articulos-por-proveedor
router.get('/articulos-por-proveedor', reportesController.getArticulosPorProveedor);

// GET /api/reportes/resumen-mensual?anio=2026
router.get('/resumen-mensual', reportesController.getResumenMensual);

export { router as reportesRoutes };
