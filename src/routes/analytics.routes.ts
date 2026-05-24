import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const router = Router();

router.get(
  "/overview",
  authMiddleware,
  requireRole([
    "Admin",
    "SuperAdmin",
    "InstitutionAdmin",
    "InsuranceAdmin",
    "BNPLAdmin",
    "Insurance",
    "BNPL",
  ]),
  analyticsController.getOverview,
);
router.get(
  "/events",
  authMiddleware,
  requireRole([
    "Admin",
    "SuperAdmin",
    "InstitutionAdmin",
    "InsuranceAdmin",
    "BNPLAdmin",
    "Insurance",
    "BNPL",
  ]),
  analyticsController.getEvents,
);

export default router;
