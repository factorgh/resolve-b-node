import { Router } from 'express';
import { documentController } from '../controllers/document.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();

// Customer endpoints
router.get('/my-documents', authMiddleware, documentController.getUserDocuments);
router.post('/upload', authMiddleware, documentController.uploadDocument);

// Admin & Partner endpoints
router.get(
  '/admin', 
  authMiddleware, 
  requireRole(['Admin', 'SuperAdmin', 'InstitutionAdmin', 'InsuranceAdmin', 'BNPLAdmin', 'Insurance', 'BNPL']), 
  documentController.adminGetPendingDocuments
);
router.patch(
  '/admin/:id/verify', 
  authMiddleware, 
  requireRole(['Admin', 'SuperAdmin', 'InstitutionAdmin', 'InsuranceAdmin', 'BNPLAdmin', 'Insurance', 'BNPL']), 
  documentController.adminVerifyDocument
);

export default router;
