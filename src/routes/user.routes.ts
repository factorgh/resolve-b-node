import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { requirePermission } from '../middlewares/permission.middleware';

const router = Router();
const allowedRoles = [
  'Admin',
  'SuperAdmin',
  'InstitutionAdmin',
  'InsuranceAdmin',
  'BNPLAdmin',
  'Insurance',
  'BNPL',
  'InstitutionStaff',
  'InsuranceStaff',
  'BNPLStaff'
];

router.get(
  '/', 
  authMiddleware, 
  requireRole(allowedRoles), 
  requirePermission('applications'),
  userController.getAllUsers
);
router.post(
  '/b2b/staff',
  authMiddleware,
  requireRole(['InstitutionAdmin', 'InsuranceAdmin', 'BNPLAdmin']),
  userController.b2bOnboardStaff
);
router.get(
  '/b2b/staff',
  authMiddleware,
  requireRole(['InstitutionAdmin', 'InsuranceAdmin', 'BNPLAdmin']),
  userController.b2bGetStaff
);
router.delete(
  '/b2b/staff/:id',
  authMiddleware,
  requireRole(['InstitutionAdmin', 'InsuranceAdmin', 'BNPLAdmin']),
  userController.b2bDeboardStaff
);
router.patch(
  '/b2b/staff/:id/permissions',
  authMiddleware,
  requireRole(['InstitutionAdmin', 'InsuranceAdmin', 'BNPLAdmin']),
  userController.b2bUpdateStaffPermissions
);
router.get('/me', authMiddleware, userController.getMe);
router.put('/profile', authMiddleware, userController.updateProfile);
router.get(
  '/dashboard-metrics', 
  authMiddleware, 
  requirePermission('dashboard'),
  userController.getDashboardMetrics
);
router.get(
  '/:id', 
  authMiddleware, 
  requireRole(allowedRoles), 
  requirePermission('applications'),
  userController.getUserById
);
router.patch(
  '/:id', 
  authMiddleware, 
  requireRole(allowedRoles), 
  requirePermission('applications'),
  userController.adminUpdateUser
);

router.patch(
  '/:id/score',
  authMiddleware,
  requireRole(['Admin', 'SuperAdmin', 'InstitutionAdmin', 'InstitutionStaff']),
  requirePermission('applications'),
  userController.calculateCreditScore
);

router.post(
  '/pay-subscription',
  authMiddleware,
  userController.paySubscription
);

export default router;
