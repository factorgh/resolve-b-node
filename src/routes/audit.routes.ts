import { Router } from 'express';
import { auditController } from '../controllers/audit.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';

const router = Router();

router.get(
  '/',
  authMiddleware,
  requireRole(['Admin', 'SuperAdmin', 'InstitutionAdmin', 'InsuranceAdmin', 'BNPLAdmin', 'Insurance', 'BNPL']),
  auditController.getAuditLogs
);

export default router;
