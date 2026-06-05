import { Router } from "express";
import { billingController } from "../controllers/billing.controller";
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
  "/invoices",
  authMiddleware,
  requireRole(allowedRoles),
  requirePermission("billing"),
  billingController.getInvoices,
);

router.get(
  "/institutions",
  authMiddleware,
  requireRole(["Admin", "SuperAdmin"]),
  billingController.getInstitutionsBilling,
);

router.patch(
  "/institutions/:id",
  authMiddleware,
  requireRole(["Admin", "SuperAdmin"]),
  billingController.updateSubscriptionFee,
);

router.post(
  "/invoices",
  authMiddleware,
  requireRole(["Admin", "SuperAdmin"]),
  billingController.createInvoice,
);

router.post(
  "/invoices/:id/pay",
  authMiddleware,
  requireRole(allowedRoles),
  requirePermission("billing"),
  billingController.payInvoice,
);

router.post(
  "/invoices/:id/initialize-payment",
  authMiddleware,
  requireRole(allowedRoles),
  requirePermission("billing"),
  billingController.initializeInvoicePayment,
);

router.get(
  "/plans",
  authMiddleware,
  requireRole(["Admin", "SuperAdmin"]),
  billingController.getFeePlans,
);

router.get(
  "/plans/:id",
  authMiddleware,
  requireRole(["Admin", "SuperAdmin"]),
  billingController.getFeePlan,
);

router.post(
  "/plans",
  authMiddleware,
  requireRole(["Admin", "SuperAdmin"]),
  billingController.createFeePlan,
);

router.patch(
  "/plans/:id",
  authMiddleware,
  requireRole(["Admin", "SuperAdmin"]),
  billingController.updateFeePlan,
);

router.delete(
  "/plans/:id",
  authMiddleware,
  requireRole(["Admin", "SuperAdmin"]),
  billingController.deleteFeePlan,
);

router.post(
  "/plans/:id/apply/:institutionId",
  authMiddleware,
  requireRole(["Admin", "SuperAdmin"]),
  billingController.applyFeePlanToInstitution,
);

router.post(
  "/trigger-run",
  authMiddleware,
  requireRole(["Admin", "SuperAdmin"]),
  billingController.triggerBillingRun,
);

export default router;
