import mongoose, { Schema, Document } from "mongoose";

export interface IPremiumFeatureUsage extends Document {
  userId: mongoose.Types.ObjectId;
  subscriptionPlanId: mongoose.Types.ObjectId;
  feature: string;
  usageCount: number;
  lastAccessedAt: Date;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PremiumFeatureUsageSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subscriptionPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true,
    },
    feature: { type: String, required: true },
    usageCount: { type: Number, default: 0 },
    lastAccessedAt: { type: Date, default: Date.now },
    isEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IPremiumFeatureUsage>(
  "PremiumFeatureUsage",
  PremiumFeatureUsageSchema
);
