import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { usuarioRoutes } from './usuario.routes.js';
import { rolRoutes } from './rol.routes.js';
import { rubroRoutes } from './rubro.routes.js';
import { clienteRoutes } from './cliente.routes.js';
import { proveedorRoutes } from './proveedor.routes.js';
import { articuloRoutes } from './articulo.routes.js';
import { stockRoutes } from './stock.routes.js';
import { dashboardRoutes } from './dashboard.routes.js';
import { auditLogRoutes } from './auditLog.routes.js';
import marcaRoutes from './marca.routes.js';
import importarRoutes from './importar.routes.js';
import { reportesRoutes } from './reportes.routes.js';
import { sugerenciaRoutes } from './sugerencia.routes.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
router.use('/auth', authRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/roles', rolRoutes);
router.use('/rubros', rubroRoutes);
router.use('/clientes', clienteRoutes);
router.use('/proveedores', proveedorRoutes);
router.use('/articulos', articuloRoutes);
router.use('/stock', stockRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit', auditLogRoutes);
router.use('/marcas', marcaRoutes);
router.use('/importar', importarRoutes);
router.use('/reportes', reportesRoutes);
router.use('/sugerencias', sugerenciaRoutes);

export { router as apiRoutes };
