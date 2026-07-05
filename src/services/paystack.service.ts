import axios, { AxiosError } from "axios";
import crypto from "crypto";
import PaymentTransaction from "../models/paymentTransaction.model";
import FinancialProduct from "../models/product.model";
import User from "../models/user.model";
import Transaction from "../models/transaction.model";
import Institution from "../models/institution.model";
import { auditLogger } from "../utils/auditLogger";
import Application from "../models/application.model";
import BillingInvoice from "../models/billing.model";
import { notificationService } from "./notification.service";
import { claimPaymentSuccess, claimInvoicePaid } from "./paymentProcessing.service";
import SubscriptionPlan from "../models/subscriptionPlan.model";
import PremiumFeatureUsage from "../models/premiumFeatureUsage.model";

const PAYSTACK_API_BASE = "https://api.paystack.co";
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET;

interface InitiatePaymentPayload {
  email: string;
  amount: number; // in kobo (1 GHS = 100 kobo)
  reference: string;
  userId: string;
  productId?: string;
  applicationId?: string;
  description?: string;
  metadata?: Record<string, any>;
  callbackUrl?: string;
  isRetry?: boolean;
}

interface PaystackResponse {
  status: boolean;
  message: string;
  data?: any;
}

export const paystackService = {
  /**
   * Initialize a payment with Paystack
   */
  async initiatePayment(payload: InitiatePaymentPayload) {
    try {
      const {
        email,
        amount,
        reference,
        userId,
        productId,
        applicationId,
        description,
        metadata,
        callbackUrl,
        isRetry,
      } = payload;

      // Validate idempotency: check if reference already exists
      const existingTransaction = await PaymentTransaction.findOne({
        reference,
      });
      if (existingTransaction && !isRetry) {
        throw new Error(`Payment reference ${reference} already exists`);
      }

      // Prepare Paystack request
      const paystackPayload = {
        email,
        amount, // Amount in kobo
        reference,
        callback_url:
          callbackUrl || `${process.env.APP_URL}/api/v1/Payments/callback`,
        metadata: {
          userId,
          productId,
          applicationId,
          customData: metadata,
        },
      };

      // Call Paystack initialization endpoint
      const response = await axios.post<PaystackResponse>(
        `${PAYSTACK_API_BASE}/transaction/initialize`,
        paystackPayload,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.data.status) {
        throw new Error(
          response.data.message || "Failed to initialize payment",
        );
      }

      const { access_code, authorization_url } = response.data.data;

      let transaction;
      if (isRetry && existingTransaction) {
        transaction = existingTransaction;
        transaction.authorizationUrl = authorization_url;
        transaction.accessCode = access_code;
        transaction.status = "pending";
        transaction.providerResponse = response.data.data;
      } else {
        // Store transaction in database
        transaction = new PaymentTransaction({
          userId,
          productId,
          applicationId,
          reference,
          amount: amount / 100, // Convert back to GHS
          currency: "GHS",
          status: "pending",
          authorizationUrl: authorization_url,
          accessCode: access_code,
          description,
          metadata,
          providerResponse: response.data.data,
          customerEmail: email,
          retryCount: 0,
        });
      }

      await transaction.save();

      return {
        success: true,
        transactionId: transaction._id,
        authorizationUrl: authorization_url,
        accessCode: access_code,
        reference,
      };
    } catch (error: any) {
      console.error("Paystack initiate payment error:", error.message);
      throw new Error(`Payment initialization failed: ${error.message}`);
    }
  },

  /**
   * Verify a payment with Paystack
   */
  async verifyPayment(reference: string) {
    try {
      // Call Paystack verification endpoint
      const response = await axios.get<PaystackResponse>(
        `${PAYSTACK_API_BASE}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        },
      );

      if (!response.data.status) {
        throw new Error(response.data.message || "Payment verification failed");
      }

      const paymentData = response.data.data;

      const transaction = await PaymentTransaction.findOne({ reference });
      if (!transaction) {
        throw new Error(`Transaction with reference ${reference} not found`);
      }

      if (paymentData.status !== "success") {
        transaction.status = "failed";
        transaction.failureReason =
          paymentData.gateway_response || "Payment unsuccessful";
        transaction.verificationData = {
          verifiedAt: new Date(),
          verificationResponse: paymentData,
        };
        transaction.providerResponse = paymentData;
        transaction.paymentMethod =
          paymentData.authorization?.channel || "unknown";
        await transaction.save();

        return {
          success: false,
          status: paymentData.status,
          transactionId: transaction._id,
          transaction,
        };
      }

      const { claimed, idempotent, transaction: claimedTx } =
        await claimPaymentSuccess(
          reference,
          paymentData,
          paymentData.authorization?.channel || "unknown",
        );

      if (!claimedTx) {
        throw new Error(`Transaction with reference ${reference} not found`);
      }

      if (claimed) {
        await this.processSuccessfulPaymentSideEffects(claimedTx, paymentData);
      }

      return {
        success: true,
        status: "success",
        transactionId: claimedTx._id,
        transaction: claimedTx,
        idempotent: idempotent && !claimed,
      };
    } catch (error: any) {
      console.error("Paystack verify payment error:", error.message);
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  },

  /**
   * Validate webhook signature from Paystack
   */
  validateWebhookSignature(body: string | any, signature: string): boolean {
    try {
      const payload = typeof body === "string" ? body : JSON.stringify(body);
      const hash = crypto
        .createHmac("sha512", PAYSTACK_WEBHOOK_SECRET || "")
        .update(payload)
        .digest("hex");
      return hash === signature;
    } catch (error) {
      console.error("Webhook signature validation error:", error);
      return false;
    }
  },

  /**
   * Handle Paystack webhook event
   */
  async handleWebhookEvent(event: any) {
    try {
      const { event: eventType, data } = event;

      switch (eventType) {
        case "charge.success":
          return await this.handleChargeSuccess(data);
        case "charge.failed":
          return await this.handleChargeFailed(data);
        default:
          console.log(`Unhandled webhook event: ${eventType}`);
          return { handled: false };
      }
    } catch (error: any) {
      console.error("Webhook event handling error:", error.message);
      throw new Error(`Failed to handle webhook event: ${error.message}`);
    }
  },

  /**
   * Handle successful charge webhook
   */
  async handleChargeSuccess(data: any) {
    try {
      const { reference } = data;

      const { claimed, idempotent, transaction } = await claimPaymentSuccess(
        reference,
        data,
        data.authorization?.channel || "card",
      );

      if (!transaction) {
        console.warn(
          `Transaction with reference ${reference} not found during webhook`,
        );
        return { handled: false };
      }

      if (!claimed) {
        return { handled: true, idempotent, reference, amount: data.amount };
      }

      await this.processSuccessfulPaymentSideEffects(transaction, data);

      console.log(`Payment successful: ${reference}`);
      return { handled: true, reference, amount: data.amount };
    } catch (error: any) {
      console.error("Handle charge success error:", error.message);
      throw new Error(`Failed to handle charge success: ${error.message}`);
    }
  },

  /**
   * Shared post-payment side effects (idempotent where possible)
   */
  async processSuccessfulPaymentSideEffects(transaction: any, data: any) {
    const reference = transaction.reference;

    const institutionId =
      transaction.metadata?.institutionId ||
      transaction.metadata?.customData?.institutionId;
    const authorizationCode = data.authorization?.authorization_code;
    if (institutionId && authorizationCode) {
      await Institution.findByIdAndUpdate(institutionId, {
        paystackAuthorizationCode: authorizationCode,
      });
    }

    const isClientConnectionFee =
      transaction.metadata?.isClientConnectionFee ||
      transaction.metadata?.customData?.isClientConnectionFee ||
      data.metadata?.customData?.isClientConnectionFee;

    if (isClientConnectionFee) {
      await this.activateConnectionFeeApplication(transaction, data);
    }

    const isInvoicePayment =
      transaction.metadata?.isInvoicePayment ||
      transaction.metadata?.customData?.isInvoicePayment ||
      data.metadata?.customData?.isInvoicePayment;

    if (isInvoicePayment) {
      const invoiceId =
        transaction.metadata?.invoiceId ||
        transaction.metadata?.customData?.invoiceId ||
        data.metadata?.invoiceId ||
        data.metadata?.customData?.invoiceId;

      if (invoiceId) {
        const invoice = await claimInvoicePaid(invoiceId);
        if (invoice) {
          const ledgerRef = `INV-PAY-${invoice.reference}`;
          const existingLedger = await Transaction.findOne({ reference: ledgerRef });
          if (!existingLedger) {
            await Transaction.create({
              userId: transaction.userId,
              institutionId: invoice.institutionId,
              description: invoice.description || `Platform invoice settlement (${invoice.reference})`,
              amount: invoice.amount,
              type: "debit",
              category: "Subscription",
              status: "Completed",
              reference: ledgerRef,
              date: new Date(),
            });
          }
        }
      }
    }

    await this.activateSubscription(transaction);
  },

  async activateConnectionFeeApplication(transaction: any, data: any) {
    const appId =
      transaction.applicationId ||
      transaction.metadata?.applicationId ||
      transaction.metadata?.customData?.applicationId ||
      data.metadata?.applicationId ||
      data.metadata?.customData?.applicationId;

    if (!appId) return;

    const application = await Application.findOneAndUpdate(
      { _id: appId, status: { $ne: "Pending" } },
      { $set: { status: "Pending" } },
      { new: true },
    );
    if (!application) return;

    await auditLogger.log({
      adminId: transaction.userId.toString(),
      action: "PAYMENT_VERIFIED",
      targetId: application._id as any,
      details: `Settled client connection fee of GH₵ ${transaction.amount} via Paystack. Reference: ${transaction.reference}.`,
    });

    const ledgerRef = `CONN-PAYSTACK-${transaction.reference}`;
    const existingLedger = await Transaction.findOne({ reference: ledgerRef });
    if (!existingLedger) {
      await Transaction.create({
        userId: transaction.userId,
        applicationId: application._id,
        description: transaction.description || `Client Connection Agent Fee Settlement via Paystack`,
        amount: transaction.amount,
        type: "debit",
        category: "ConnectionFee",
        status: "Completed",
        reference: ledgerRef,
        date: new Date(),
      });
    }

    const user = await User.findById(transaction.userId);
    const product = await FinancialProduct.findById(application.productId).populate("institutionId");
    const institutionName = (product?.institutionId as any)?.name || "Partner Institution";
    const productName = product?.name || "Financial Product";

    if (user?._id) {
      await notificationService.notifyUser({
        userId: user._id.toString(),
        type: "ApplicationReview",
        title: "Application Submitted Successfully",
        message: `Your connection fee of GH₵ ${transaction.amount.toLocaleString()} was verified successfully. Your application for ${productName} has been submitted to ${institutionName} for review.`,
        targetId: application._id.toString(),
        email: true,
        sms: true,
      });
    }

    try {
      if (product?.institutionId) {
        const institutionUsers = await User.find({
          institutionId: (product.institutionId as any)._id || product.institutionId,
          role: { $in: ["InstitutionAdmin", "InstitutionStaff", "InsuranceAdmin", "InsuranceStaff", "BNPLAdmin", "BNPLStaff"] },
        });

        await Promise.all(
          institutionUsers.map((instUser) =>
            notificationService.createNotification({
              userId: instUser._id.toString(),
              type: "ApplicationReview",
              title: "New Application Received",
              message: `A new application of GH₵ ${application.amount.toLocaleString()} has been submitted for ${productName} by ${user?.firstName || "Applicant"} ${user?.lastName || ""} and is awaiting review.`,
              targetId: application._id.toString(),
            }),
          ),
        );
      }
    } catch (err: any) {
      console.error("[PaystackService] Failed to send B2B notifications:", err.message);
    }
  },

  /**
   * Handle failed charge webhook
   */
  async handleChargeFailed(data: any) {
    try {
      const { reference } = data;

      // Find transaction
      const transaction = await PaymentTransaction.findOne({ reference });
      if (!transaction) {
        console.warn(
          `Transaction with reference ${reference} not found during webhook`,
        );
        return { handled: false };
      }

      // Update transaction
      transaction.status = "failed";
      transaction.failureReason = data.gateway_response || "Payment failed";
      transaction.verificationData = {
        verifiedAt: new Date(),
        verificationResponse: data,
      };

      await transaction.save();

      // Do not auto-blacklist products on a single failed payment — log only
      if (transaction.productId) {
        await auditLogger.log({
          adminId: "system",
          action: "PaymentFailed",
          targetId: transaction.productId.toString(),
          details: `Payment ${reference} failed: ${transaction.failureReason}. Product was NOT auto-blacklisted.`,
        });
      }

      console.log(`Payment failed: ${reference}`);

      return { handled: true, reference };
    } catch (error: any) {
      console.error("Handle charge failed error:", error.message);
      throw new Error(`Failed to handle charge failed: ${error.message}`);
    }
  },

  /**
   * Retry a failed payment
   */
  async retryPayment(reference: string, callbackUrl?: string) {
    try {
      const transaction = await PaymentTransaction.findOne({ reference });
      if (!transaction) {
        throw new Error(`Transaction with reference ${reference} not found`);
      }

      if (transaction.status === "success") {
        throw new Error("Cannot retry a successful payment");
      }

      // Increment retry count
      transaction.retryCount += 1;
      transaction.lastRetryAt = new Date();
      transaction.status = "retry";

      // Re-initialize payment with same reference
      const result = await this.initiatePayment({
        email: transaction.customerEmail,
        amount: Math.round(transaction.amount * 100), // Convert to kobo
        reference,
        userId: transaction.userId.toString(),
        productId: transaction.productId?.toString(),
        applicationId: transaction.applicationId?.toString(),
        description: transaction.description,
        metadata: transaction.metadata,
        callbackUrl,
        isRetry: true,
      });

      return result;
    } catch (error: any) {
      console.error("Retry payment error:", error.message);
      throw new Error(`Payment retry failed: ${error.message}`);
    }
  },

  /**
   * Get transaction by reference
   */
  async getTransactionByReference(reference: string) {
    try {
      const transaction = await PaymentTransaction.findOne({
        reference,
      }).populate("userId productId applicationId");
      if (!transaction) {
        throw new Error(`Transaction with reference ${reference} not found`);
      }
      return transaction;
    } catch (error: any) {
      console.error("Get transaction error:", error.message);
      throw new Error(`Failed to get transaction: ${error.message}`);
    }
  },

  /**
   * Activate customer platform subscription upon successful payment
   */
  async activateSubscription(transaction: any) {
    try {
      if (transaction.status !== "success") return;

      const isSubscription =
        transaction.metadata?.isSubscription ||
        transaction.metadata?.customData?.isSubscription ||
        transaction.description?.toLowerCase().includes("subscription");
      if (!isSubscription) return;

      const ledgerRef = `SUB-PAYSTACK-${transaction.reference}`;
      const existingLedger = await Transaction.findOne({ reference: ledgerRef });
      if (existingLedger) {
        console.log(`[SubscriptionBilling] Ledger entry ${ledgerRef} already exists.`);
        return;
      }

      const planId =
        transaction.metadata?.planId ||
        transaction.metadata?.customData?.planId;

      const billingCycle =
        transaction.metadata?.billingCycle ||
        transaction.metadata?.customData?.billingCycle ||
        "monthly";

      const extensionMs =
        billingCycle === "yearly"
          ? 365 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;

      const user = await User.findById(transaction.userId);
      if (!user) {
        console.warn(`[SubscriptionBilling] User not found for ID ${transaction.userId}`);
        return;
      }

      const currentExpiry = user.subscriptionEndDate
        ? new Date(user.subscriptionEndDate)
        : null;
      const baseDate =
        currentExpiry && currentExpiry > new Date() ? currentExpiry : new Date();

      const updatePayload: Record<string, unknown> = {
        subscriptionFeePaid: true,
        nextSubscriptionDate: new Date(baseDate.getTime() + extensionMs),
        subscriptionStartDate: user.subscriptionStartDate || new Date(),
        subscriptionEndDate: new Date(baseDate.getTime() + extensionMs),
      };

      if (planId) {
        updatePayload.subscriptionPlanId = planId;
        const plan = await SubscriptionPlan.findById(planId);
        if (plan) {
          const features = [
            "creditMonitoring", "eligibilityChecker", "advisorAccess", "fraudProtection",
            "investmentInsights", "businessTools", "educationCourses", "debtDashboard", "vipConcierge",
          ];
          await Promise.all(
            features
              .filter((f) => (plan as any)[f])
              .map((feature) =>
                PremiumFeatureUsage.updateOne(
                  { userId: user._id, feature },
                  { userId: user._id, subscriptionPlanId: planId, feature, isEnabled: true },
                  { upsert: true },
                ),
              ),
          );
        }
      }

      await User.findByIdAndUpdate(user._id, { $set: updatePayload });

      await Transaction.create({
        userId: transaction.userId,
        description: transaction.description || "Platform Access Fee Settlement via Paystack",
        amount: transaction.amount,
        type: "debit",
        category: "Subscription",
        status: "Completed",
        reference: ledgerRef,
        date: new Date(),
      });

      await auditLogger.log({
        adminId: user._id.toString(),
        action: "PAYMENT_VERIFIED",
        details: `Settled subscription of GH₵ ${transaction.amount} via Paystack. Reference: ${transaction.reference}${planId ? ` Plan: ${planId}` : ""}`,
      });

      console.log(`[SubscriptionBilling] Successfully activated subscription for user ${user._id}`);
    } catch (error: any) {
      console.error("[SubscriptionBilling] Error activating subscription:", error.message);
    }
  },

  /**
   * Charge a tokenized card in the background (recurring/authorization charge)
   */
  async chargeAuthorization(email: string, amount: number, authorizationCode: string, reference: string, metadata?: any) {
    try {
      const payload = {
        email,
        amount, // in kobo
        authorization_code: authorizationCode,
        reference,
        metadata,
      };

      const response = await axios.post<PaystackResponse>(
        `${PAYSTACK_API_BASE}/transaction/charge_authorization`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      return response.data;
    } catch (error: any) {
      console.error("[PaystackService] Charge authorization error:", error.message);
      return { status: false, message: error.message };
    }
  },
};
