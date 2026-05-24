import mongoose, { Schema, Document } from "mongoose";

export interface IPaymentTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId;
  applicationId?: mongoose.Types.ObjectId;
  reference: string; // Paystack reference
  amount: number;
  currency: string; // GHS, USD, etc.
  status: "pending" | "success" | "failed" | "cancelled" | "retry";
  paymentMethod: string; // card, bank_transfer, etc.
  authorizationUrl?: string; // For payment flow
  accessCode?: string; // Paystack access code
  description?: string;
  metadata?: Record<string, any>;
  providerResponse?: Record<string, any>; // Full Paystack response
  verificationData?: {
    verifiedAt?: Date;
    verificationResponse?: Record<string, any>;
  };
  retryCount: number;
  lastRetryAt?: Date;
  failureReason?: string;
  customerEmail: string;
  customerPhone?: string;
  isBlacklisted?: boolean; // Flag for failed payment blacklist
  blacklistReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentTransactionSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "FinancialProduct" },
    applicationId: { type: Schema.Types.ObjectId, ref: "Application" },
    reference: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "GHS" },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "cancelled", "retry"],
      default: "pending",
      index: true,
    },
    paymentMethod: { type: String },
    authorizationUrl: { type: String },
    accessCode: { type: String },
    description: { type: String },
    metadata: { type: Schema.Types.Mixed },
    providerResponse: { type: Schema.Types.Mixed },
    verificationData: {
      verifiedAt: { type: Date },
      verificationResponse: { type: Schema.Types.Mixed },
    },
    retryCount: { type: Number, default: 0 },
    lastRetryAt: { type: Date },
    failureReason: { type: String },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String },
    isBlacklisted: { type: Boolean, default: false },
    blacklistReason: { type: String },
  },
  { timestamps: true },
);

// Index for queries
PaymentTransactionSchema.index({ userId: 1, createdAt: -1 });
PaymentTransactionSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IPaymentTransaction>(
  "PaymentTransaction",
  PaymentTransactionSchema,
);
