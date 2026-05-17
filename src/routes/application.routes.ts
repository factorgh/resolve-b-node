import { Router } from 'express';
import { applicationController } from '../controllers/application.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();

// Customer routes
router.get('/my-applications', authMiddleware, applicationController.getUserApplications);
router.post('/', authMiddleware, applicationController.createApplication);

// Admin & Partner routes
router.get(
  '/admin', 
  authMiddleware, 
  requireRole(['Admin', 'SuperAdmin', 'InstitutionAdmin', 'InsuranceAdmin', 'BNPLAdmin', 'Insurance', 'BNPL']), 
  applicationController.adminGetApplications
);
router.patch(
  '/admin/:id/review', 
  authMiddleware, 
  requireRole(['Admin', 'SuperAdmin', 'InstitutionAdmin', 'InsuranceAdmin', 'BNPLAdmin', 'Insurance', 'BNPL']), 
  applicationController.adminReviewApplication
);

export default router;
