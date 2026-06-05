import { Router } from 'express';
import { documentController } from '../controllers/document.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { requirePermission } from '../middlewares/permission.middleware';

const router = Router();

// Customer endpoints
router.get('/my-documents', authMiddleware, documentController.getUserDocuments);
router.post('/upload', authMiddleware, documentController.uploadDocument);

// Admin & Partner endpoints
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
  '/admin', 
  authMiddleware, 
  requireRole(allowedRoles), 
  requirePermission('kyc'),
  documentController.adminGetPendingDocuments
);
router.patch(
  '/admin/:id/verify', 
  authMiddleware, 
  requireRole(allowedRoles), 
  requirePermission('kyc'),
  documentController.adminVerifyDocument
);

export default router;
