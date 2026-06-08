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

      // Find and update transaction
      const transaction = await PaymentTransaction.findOne({ reference });
      if (!transaction) {
        throw new Error(`Transaction with reference ${reference} not found`);
      }

      // Update transaction with verification data
      transaction.status =
        paymentData.status === "success" ? "success" : "failed";
      transaction.verificationData = {
        verifiedAt: new Date(),
        verificationResponse: paymentData,
      };
      transaction.providerResponse = paymentData;
      transaction.paymentMethod =
        paymentData.authorization?.channel || "unknown";

      if (paymentData.status !== "success") {
        transaction.failureReason =
          paymentData.gateway_response || "Payment unsuccessful";
      }

      await transaction.save();

      // Trigger subscription activation if success
      if (transaction.status === "success") {
        await this.activateSubscription(transaction);
      }

      return {
        success: paymentData.status === "success",
        status: paymentData.status,
        transactionId: transaction._id,
        transaction,
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
      const { reference, customer, amount } = data;

      // Find transaction
      const transaction = await PaymentTransaction.findOne({ reference });
      if (!transaction) {
        console.warn(
          `Transaction with reference ${reference} not found during webhook`,
        );
        return { handled: false };
      }

      // Verify idempotency: only update if status is not already success
      if (transaction.status === "success") {
        console.log(`Transaction ${reference} already processed`);
        return { handled: true, idempotent: true };
      }

      // Update transaction
      transaction.status = "success";
      transaction.verificationData = {
        verifiedAt: new Date(),
        verificationResponse: data,
      };
      transaction.paymentMethod = data.authorization?.channel || "card";

      await transaction.save();

      // Save Paystack authorization code for recurring partner billing if institutionId is in metadata
      const institutionId = transaction.metadata?.institutionId || transaction.metadata?.customData?.institutionId;
      const authorizationCode = data.authorization?.authorization_code;
      if (institutionId && authorizationCode) {
        const inst = await Institution.findById(institutionId);
        if (inst) {
          inst.paystackAuthorizationCode = authorizationCode;
          await inst.save();
          console.log(`[PaystackService] Saved recurring payment token for institution ${inst.name}`);
        }
      }

      // Handle client connection fee payment activation
      const isClientConnectionFee = 
        transaction.metadata?.isClientConnectionFee || 
        transaction.metadata?.customData?.isClientConnectionFee ||
        data.metadata?.customData?.isClientConnectionFee;

      if (isClientConnectionFee) {
        const appId = 
          transaction.applicationId || 
          transaction.metadata?.applicationId || 
          transaction.metadata?.customData?.applicationId ||
          data.metadata?.applicationId ||
          data.metadata?.customData?.applicationId;

        if (appId) {
          const application = await Application.findById(appId);
          if (application) {
            application.status = "Pending";
            await application.save();

            // Log client connection fee payment settlement in the compliance audit ledger
            await auditLogger.log({
              adminId: transaction.userId.toString(),
              action: "PAYMENT_VERIFIED",
              targetId: application._id as any,
              details: `Settled client connection fee of GH₵ ${transaction.amount} via Paystack. Reference: ${transaction.reference}. Application ${application._id} is now set to "Pending" and formally submitted to the partner review desk.`,
            });

            // Create standard ledger record
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
            }            // Notify user of successful submission
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

            // Notify B2B partner institution admins/staff of the new application
            try {
              if (product && product.institutionId) {
                const institutionUsers = await User.find({
                  institutionId: (product.institutionId as any)._id || product.institutionId,
                  role: { $in: ["InstitutionAdmin", "InstitutionStaff", "InsuranceAdmin", "InsuranceStaff", "BNPLAdmin", "BNPLStaff"] },
                });
                
                for (const instUser of institutionUsers) {
                  await notificationService.createNotification({
                    userId: instUser._id.toString(),
                    type: "ApplicationReview",
                    title: "New Application Received",
                    message: `A new application of GH₵ ${application.amount.toLocaleString()} has been submitted for ${productName} by ${user?.firstName || "Applicant"} ${user?.lastName || ""} and is awaiting review.`,
                    targetId: application._id.toString(),
                  });
                }
                console.log(`[PaystackService] Notified ${institutionUsers.length} B2B users of institution ${product.institutionId} for application ${application._id}`);
              }
            } catch (err: any) {
              console.error("[PaystackService] Failed to send B2B notifications:", err.message);
            }

            console.log(`[PaystackService] Successfully activated application ${application._id} following connection fee payment.`);
          } else {
            console.warn(`[PaystackService] Application ${appId} not found for connection fee activation`);
          }
        }
      }
      // Handle invoice payment activation
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
          const invoice = await BillingInvoice.findById(invoiceId);
          if (invoice && invoice.status !== "Paid") {
            invoice.status = "Paid";
            invoice.paidAt = new Date();
            await invoice.save();

            // Create standard ledger record
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

            console.log(`[PaystackService] Successfully settled invoice ${invoice._id} following payment.`);
          }
        }
      }

      // Trigger subscription activation
      await this.activateSubscription(transaction);

      console.log(`Payment successful: ${reference}`);

      return { handled: true, reference, amount };
    } catch (error: any) {
      console.error("Handle charge success error:", error.message);
      throw new Error(`Failed to handle charge success: ${error.message}`);
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

      if (transaction.productId) {
        const product = await FinancialProduct.findById(transaction.productId);
        if (product && !product.isBlacklisted) {
          product.isBlacklisted = true;
          product.blacklistReason =
            transaction.failureReason || "Failed payment";
          product.blacklistedAt = new Date();
          await product.save();

          await auditLogger.log({
            adminId: "system",
            action: "AutoBlacklistProduct",
            targetId: product._id as any,
            details: `Automatically blacklisted product ${product.name} after failed payment ${reference}`,
          });
        }
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
        transaction.description?.toLowerCase().includes("subscription");
      if (!isSubscription) return;

      // Verify if a ledger transaction for this reference already exists to prevent duplicate actions
      const ledgerRef = `SUB-PAYSTACK-${transaction.reference}`;
      const existingLedger = await Transaction.findOne({ reference: ledgerRef });
      if (existingLedger) {
        console.log(`[SubscriptionBilling] Ledger entry ${ledgerRef} already exists.`);
        return;
      }

      const user = await User.findById(transaction.userId);
      if (user) {
        // Update user platform metrics
        user.subscriptionFeePaid = true;
        const currentExpiry = user.nextSubscriptionDate ? new Date(user.nextSubscriptionDate) : null;
        if (currentExpiry && currentExpiry > new Date()) {
          user.nextSubscriptionDate = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
        } else {
          user.nextSubscriptionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
        await user.save();

        // Create standard ledger record
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
          details: `Settled monthly platform subscription of GH₵ ${transaction.amount} via Paystack. Reference: ${transaction.reference}`,
        });

        console.log(`[SubscriptionBilling] Successfully activated platform subscription for user ${user._id}`);
      } else {
        console.warn(`[SubscriptionBilling] User not found for ID ${transaction.userId}`);
      }
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
