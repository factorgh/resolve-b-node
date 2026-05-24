import express, { Router } from "express";
import { paymentController } from "../controllers/payment.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const router = Router();

// Public webhook (no auth required). Use raw body to preserve Paystack signature integrity.
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleWebhook,
);

// Protected routes (require authentication)
router.post("/initiate", authMiddleware, paymentController.initiatePayment);
router.get("/callback", paymentController.handleCallback);
router.get(
  "/transactions/:reference",
  authMiddleware,
  paymentController.getTransaction,
);
router.get("/history", authMiddleware, paymentController.getPaymentHistory);
router.post(
  "/retry/:reference",
  authMiddleware,
  paymentController.retryPayment,
);

// Admin routes
router.get(
  "/admin/transactions",
  authMiddleware,
  requireRole(["Admin", "SuperAdmin"]),
  paymentController.getAllTransactions,
);

export default router;
