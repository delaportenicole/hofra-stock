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
import { solicitudCotizacionRoutes } from './solicitudCotizacion.routes.js';
// Integración con Google Sheets/Drive en pausa (ver google.routes.ts) — desconectada
// del árbol de rutas hasta migrar a Railway, estaba crasheando la función de Vercel.
// import { googleRoutes } from './google.routes.js';

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
router.use('/solicitudes-cotizacion', solicitudCotizacionRoutes);
// router.use('/google', googleRoutes);

export { router as apiRoutes };
