import { Router } from 'express';
import { clienteController } from '../controllers/cliente.controller.js';
import { authMiddleware, requirePermission } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validation.js';
import { createClienteSchema, updateClienteSchema } from '@hofra/shared';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// List and read
router.get('/', requirePermission('clientes', 'leer'), clienteController.findAll);
router.get('/active', requirePermission('clientes', 'leer'), clienteController.findActive);
router.get('/search', requirePermission('clientes', 'leer'), clienteController.search);
router.get('/:id', requirePermission('clientes', 'leer'), clienteController.findById);

// Create
router.post('/', requirePermission('clientes', 'crear'), validateBody(createClienteSchema), clienteController.create);

// Update
router.put('/:id', requirePermission('clientes', 'actualizar'), validateBody(updateClienteSchema), clienteController.update);
router.patch('/:id', requirePermission('clientes', 'actualizar'), validateBody(updateClienteSchema), clienteController.update);

// Delete
router.delete('/:id', requirePermission('clientes', 'eliminar'), clienteController.delete);

export { router as clienteRoutes };
