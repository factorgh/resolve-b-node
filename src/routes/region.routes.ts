import { Router } from 'express';
import { regionController } from '../controllers/region.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', regionController.getAll);
router.get('/:id', regionController.getById);
router.post('/', authMiddleware, regionController.create);
router.patch('/:id', authMiddleware, regionController.update);

export default router;
