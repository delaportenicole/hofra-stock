import { Router } from 'express';
import { sinonimoColumnaExcelController } from '../controllers/sinonimoColumnaExcel.controller.js';
import { authMiddleware, requirePermission } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validation.js';
import { createSinonimoColumnaExcelSchema } from '@hofra/shared';

const router = Router();

router.use(authMiddleware);

router.get('/', requirePermission('sinonimos_columna_excel', 'leer'), sinonimoColumnaExcelController.findAll);

router.post(
  '/',
  requirePermission('sinonimos_columna_excel', 'crear'),
  validateBody(createSinonimoColumnaExcelSchema),
  sinonimoColumnaExcelController.create
);

router.delete('/:id', requirePermission('sinonimos_columna_excel', 'eliminar'), sinonimoColumnaExcelController.delete);

export { router as sinonimoColumnaExcelRoutes };
