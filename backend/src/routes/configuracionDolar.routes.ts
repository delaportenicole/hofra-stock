import { Router } from 'express';
import { configuracionDolarController } from '../controllers/configuracionDolar.controller.js';
import { authMiddleware, requireAnyPermission } from '../middlewares/auth.js';

const router = Router();

router.use(authMiddleware);

router.get(
  '/dolar',
  requireAnyPermission([
    { modulo: 'articulos', accion: 'crear' },
    { modulo: 'reposiciones', accion: 'crear' },
  ]),
  configuracionDolarController.getVigente
);

export { router as configuracionRoutes };
