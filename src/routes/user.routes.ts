import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();

router.get(
  '/', 
  authMiddleware, 
  requireRole(['Admin', 'SuperAdmin', 'InstitutionAdmin', 'InsuranceAdmin', 'BNPLAdmin', 'Insurance', 'BNPL']), 
  userController.getAllUsers
);
router.get('/me', authMiddleware, userController.getMe);
router.put('/profile', authMiddleware, userController.updateProfile);
router.get('/dashboard-metrics', authMiddleware, userController.getDashboardMetrics);
router.get(
  '/:id', 
  authMiddleware, 
  requireRole(['Admin', 'SuperAdmin', 'InstitutionAdmin', 'InsuranceAdmin', 'BNPLAdmin', 'Insurance', 'BNPL']), 
  userController.getUserById
);
router.patch(
  '/:id', 
  authMiddleware, 
  requireRole(['Admin', 'SuperAdmin', 'InstitutionAdmin', 'InsuranceAdmin', 'BNPLAdmin', 'Insurance', 'BNPL']), 
  userController.adminUpdateUser
);

export default router;
