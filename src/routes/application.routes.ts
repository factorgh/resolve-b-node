import { Router } from "express";
import { applicationController } from "../controllers/application.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const router = Router();

// Public Verification Route (No Auth Required for Inspectors)
router.get("/verify/policy", applicationController.verifyPolicyToken);

// Customer routes
router.get(
  "/my-applications",
  authMiddleware,
  applicationController.getUserApplications,
);
router.post("/", authMiddleware, applicationController.createApplication);
router.post("/:id/verify-token", authMiddleware, applicationController.generatePolicyVerificationToken);

// Admin & Partner routes
router.get(
  "/admin",
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
  applicationController.adminGetApplications,
);
router.patch(
  "/admin/:id/review",
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
  applicationController.adminReviewApplication,
);
router.patch(
  "/admin/:id/restore",
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
  applicationController.adminRestoreApplication,
);

export default router;
