import { Router } from "express";
import { applicationController } from "../controllers/application.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { requirePermission } from "../middlewares/permission.middleware";

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
router.post(
  "/:id/respond-info",
  authMiddleware,
  applicationController.respondToInfoRequest,
);
router.post("/:id/verify-token", authMiddleware, applicationController.generatePolicyVerificationToken);

// Admin & Partner routes
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
  "/admin",
  authMiddleware,
  requireRole(allowedRoles),
  requirePermission("applications"),
  applicationController.adminGetApplications,
);
router.patch(
  "/admin/:id/review",
  authMiddleware,
  requireRole(allowedRoles),
  requirePermission("applications"),
  applicationController.adminReviewApplication,
);
router.patch(
  "/admin/:id/restore",
  authMiddleware,
  requireRole(allowedRoles),
  requirePermission("applications"),
  applicationController.adminRestoreApplication,
);
router.patch(
  "/admin/:id/toggle-reminder-flag",
  authMiddleware,
  requireRole(allowedRoles),
  requirePermission("applications"),
  applicationController.adminToggleReminderFlag,
);
router.post(
  "/admin/trigger-reminders",
  authMiddleware,
  requireRole(allowedRoles),
  requirePermission("applications"),
  applicationController.adminTriggerReminders,
);
router.patch(
  "/admin/:id/assign",
  authMiddleware,
  requireRole(allowedRoles),
  requirePermission("applications"),
  applicationController.adminAssignApplication,
);

export default router;
