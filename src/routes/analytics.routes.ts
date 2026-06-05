import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
const router = Router();
const allowedRoles = [
  "Admin",
  "SuperAdmin",
  "InstitutionAdmin",
  "InsuranceAdmin",
  "BNPLAdmin",
  "Insurance",
  "BNPL",
  "InstitutionStaff",
  "InsuranceStaff",
  "BNPLStaff",
];

router.get(
  "/overview",
  authMiddleware,
  requireRole(allowedRoles),
  requirePermission("analytics"),
  analyticsController.getOverview,
);
router.get(
  "/events",
  authMiddleware,
  requireRole(allowedRoles),
  requirePermission("analytics"),
  analyticsController.getEvents,
);

export default router;
