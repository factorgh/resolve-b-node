import { Router } from 'express';
import { regionController } from '../controllers/region.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();

router.get('/', regionController.getAll);
router.get('/:id', regionController.getById);
router.post('/', authMiddleware, requireRole(['SuperAdmin', 'Admin']), regionController.create);
router.patch('/:id', authMiddleware, requireRole(['SuperAdmin', 'Admin']), regionController.update);

export default router;
