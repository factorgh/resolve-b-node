import { Request, Response } from "express";
import { paystackService } from "../services/paystack.service";
import { responseFactory } from "../utils/responseFactory";
import PaymentTransaction from "../models/paymentTransaction.model";
import { auditLogger } from "../utils/auditLogger";

export const paymentController = {
  /**
   * Initiate a payment
   * POST /api/v1/Payments/initiate
   */
  initiatePayment: async (req: any, res: Response) => {
    try {
      const { email, amount, productId, applicationId, description, metadata } =
        req.body;
      const userId = req.user.id;

      // Validate inputs
      if (!email || !amount || amount <= 0) {
        return res
          .status(400)
          .json(responseFactory.error("Email and valid amount are required"));
      }

      // Generate unique reference
      const reference = `PSK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Initiate payment with Paystack
      const result = await paystackService.initiatePayment({
        email,
        amount: Math.round(amount * 100), // Convert to kobo
        reference,
        userId,
        productId,
        applicationId,
        description,
        metadata,
      });

      // Audit log
      await auditLogger.log({
        adminId: userId,
        action: "PAYMENT_INITIATED",
        details: `Initiated payment ${reference} for amount ${amount}`,
      });

      return res
        .status(200)
        .json(
          responseFactory.success(result, "Payment initialized successfully"),
        );
    } catch (error: any) {
      console.error("Payment initiation error:", error.message);
      return res
        .status(500)
        .json(
          responseFactory.error(error.message || "Failed to initiate payment"),
        );
    }
  },

  /**
   * Callback handler for Paystack redirect
   * GET /api/v1/Payments/callback
   */
  handleCallback: async (req: any, res: Response) => {
    try {
      const { reference } = req.query;

      if (!reference) {
        return res
          .status(400)
          .json(responseFactory.error("Reference is required"));
      }

      // Verify payment with Paystack
      const result = await paystackService.verifyPayment(reference);

      // Audit log
      if (result.transaction) {
        await auditLogger.log({
          adminId: result.transaction.userId.toString(),
          action: "PAYMENT_VERIFIED",
          details: `Verified payment ${reference} with status ${result.transaction.status}`,
        });
      }

      return res
        .status(200)
        .json(
          responseFactory.success(
            result,
            result.success
              ? "Payment verified successfully"
              : "Payment verification failed",
          ),
        );
    } catch (error: any) {
      console.error("Payment callback error:", error.message);
      return res
        .status(500)
        .json(
          responseFactory.error(error.message || "Failed to verify payment"),
        );
    }
  },

  /**
   * Webhook handler for Paystack events
   * POST /api/v1/Payments/webhook
   */
  handleWebhook: async (req: any, res: Response) => {
    try {
      const rawSignature = req.headers["x-paystack-signature"];
      const signature = Array.isArray(rawSignature)
        ? rawSignature[0]
        : rawSignature;
      const rawBody = req.body;
      const payloadString = Buffer.isBuffer(rawBody)
        ? rawBody.toString("utf8")
        : JSON.stringify(rawBody);
      const payload = Buffer.isBuffer(rawBody)
        ? JSON.parse(payloadString)
        : rawBody;

      // Validate webhook signature
      if (!paystackService.validateWebhookSignature(payloadString, signature)) {
        console.error("Invalid webhook signature detected", {
          signature,
          payloadString: payloadString.slice(0, 200),
        });
        return res
          .status(401)
          .json(responseFactory.error("Unauthorized webhook"));
      }

      // Handle webhook event
      const result = await paystackService.handleWebhookEvent(payload);

      return res
        .status(200)
        .json(responseFactory.success(result, "Webhook processed"));
    } catch (error: any) {
      console.error("Webhook handling error:", error.message);
      return res
        .status(500)
        .json(
          responseFactory.error(error.message || "Failed to process webhook"),
        );
    }
  },

  /**
   * Get transaction details
   * GET /api/v1/Payments/transactions/:reference
   */
  getTransaction: async (req: any, res: Response) => {
    try {
      const { reference } = req.params;

      const transaction =
        await paystackService.getTransactionByReference(reference);

      return res
        .status(200)
        .json(
          responseFactory.success(
            transaction,
            "Transaction retrieved successfully",
          ),
        );
    } catch (error: any) {
      console.error("Get transaction error:", error.message);
      return res
        .status(404)
        .json(responseFactory.error(error.message || "Transaction not found"));
    }
  },

  /**
   * Get user's payment history
   * GET /api/v1/Payments/history
   */
  getPaymentHistory: async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { status, limit = 10, skip = 0 } = req.query;

      const query: any = { userId };
      if (status) {
        query.status = status;
      }

      const transactions = await PaymentTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .populate("productId applicationId", "name description amount");

      const total = await PaymentTransaction.countDocuments(query);

      return res
        .status(200)
        .json(
          responseFactory.success(
            {
              transactions,
              total,
              limit: parseInt(limit),
              skip: parseInt(skip),
            },
            "Payment history retrieved successfully",
          ),
        );
    } catch (error: any) {
      console.error("Get payment history error:", error.message);
      return res
        .status(500)
        .json(
          responseFactory.error(
            error.message || "Failed to retrieve payment history",
          ),
        );
    }
  },

  /**
   * Retry a failed payment
   * POST /api/v1/Payments/retry/:reference
   */
  retryPayment: async (req: any, res: Response) => {
    try {
      const { reference } = req.params;
      const userId = req.user.id;

      // Verify ownership
      const transaction = await PaymentTransaction.findOne({
        reference,
        userId,
      });
      if (!transaction) {
        return res
          .status(404)
          .json(responseFactory.error("Transaction not found"));
      }

      // Retry payment
      const result = await paystackService.retryPayment(reference);

      // Audit log
      await auditLogger.log({
        adminId: userId,
        action: "PAYMENT_RETRY",
        details: `Retry initiated for payment ${reference}, count ${transaction.retryCount + 1}`,
      });

      return res
        .status(200)
        .json(responseFactory.success(result, "Payment retry initiated"));
    } catch (error: any) {
      console.error("Retry payment error:", error.message);
      return res
        .status(500)
        .json(
          responseFactory.error(error.message || "Failed to retry payment"),
        );
    }
  },

  /**
   * Get all transactions (admin only)
   * GET /api/v1/Payments/admin/transactions
   */
  getAllTransactions: async (req: any, res: Response) => {
    try {
      const { status, limit = 20, skip = 0, startDate, endDate } = req.query;

      const query: any = {};

      if (status) {
        query.status = status;
      }

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const transactions = await PaymentTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .populate(
          "userId productId applicationId",
          "name email firstName lastName",
        );

      const total = await PaymentTransaction.countDocuments(query);

      // Calculate summary
      const summary = await PaymentTransaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$status",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]);

      return res
        .status(200)
        .json(
          responseFactory.success(
            {
              transactions,
              total,
              summary,
              limit: parseInt(limit),
              skip: parseInt(skip),
            },
            "All transactions retrieved successfully",
          ),
        );
    } catch (error: any) {
      console.error("Get all transactions error:", error.message);
      return res
        .status(500)
        .json(
          responseFactory.error(
            error.message || "Failed to retrieve transactions",
          ),
        );
    }
  },
};
