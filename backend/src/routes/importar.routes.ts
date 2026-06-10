import { Router } from 'express';
import { importarController } from '../controllers/importar.controller.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Preview import data
router.post('/preview', importarController.preview.bind(importarController));

// Execute import
router.post('/execute', importarController.import.bind(importarController));

export default router;
