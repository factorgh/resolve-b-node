import { Router } from 'express';
import { institutionController } from '../controllers/institution.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/permission.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();

router.get('/', institutionController.getAll);
router.get('/all', authMiddleware, institutionController.getAllForAdmin);
router.get('/:id', institutionController.getById);
router.post('/', authMiddleware, requireRole(['SuperAdmin', 'Admin']), institutionController.create);
router.patch('/:id', authMiddleware, requirePermission('integrations'), institutionController.update);

export default router;
