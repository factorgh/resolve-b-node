import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, userController.getAllUsers);
router.get('/me', authMiddleware, userController.getMe);
router.put('/profile', authMiddleware, userController.updateProfile);
router.get('/dashboard-metrics', authMiddleware, userController.getDashboardMetrics);
router.get('/:id', authMiddleware, userController.getUserById);

export default router;
