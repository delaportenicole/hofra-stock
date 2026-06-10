import { Router } from 'express';
import { marcaController } from '../controllers/marca.controller.js';

const router = Router();

// Rutas públicas (requieren autenticación pero no permisos específicos)
router.get('/active', marcaController.getActive.bind(marcaController));

// CRUD
router.get('/', marcaController.findAll.bind(marcaController));
router.get('/:id', marcaController.findById.bind(marcaController));
router.post('/', marcaController.create.bind(marcaController));
router.post('/find-or-create', marcaController.findOrCreate.bind(marcaController));
router.put('/:id', marcaController.update.bind(marcaController));
router.delete('/:id', marcaController.delete.bind(marcaController));

export default router;
