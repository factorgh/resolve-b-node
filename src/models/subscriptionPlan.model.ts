import mongoose, { Schema, Document } from "mongoose";

export interface IPremiumFeature {
  name: string;
  description: string;
  icon: string;
}

export interface ISubscriptionPlan extends Document {
  name: string;
  tier: "basic" | "standard" | "premium" | "elite";
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: IPremiumFeature[];
  maxLoans: number;
  maxApplications: number;
  prioritySupport: boolean;
  advisorAccess: boolean;
  fraudProtection: boolean;
  investmentInsights: boolean;
  businessTools: boolean;
  educationCourses: boolean;
  debtDashboard: boolean;
  vipConcierge: boolean;
  eligibilityChecker: boolean;
  creditMonitoring: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    tier: {
      type: String,
      enum: ["basic", "standard", "premium", "elite"],
      required: true,
    },
    monthlyPrice: { type: Number, required: true },
    yearlyPrice: { type: Number, required: true },
    description: { type: String, required: true },
    features: [
      {
        name: { type: String, required: true },
        description: { type: String, required: true },
        icon: { type: String, required: true },
      },
    ],
    maxLoans: { type: Number, default: 3 },
    maxApplications: { type: Number, default: 5 },
    prioritySupport: { type: Boolean, default: false },
    advisorAccess: { type: Boolean, default: false },
    fraudProtection: { type: Boolean, default: false },
    investmentInsights: { type: Boolean, default: false },
    businessTools: { type: Boolean, default: false },
    educationCourses: { type: Boolean, default: false },
    debtDashboard: { type: Boolean, default: false },
    vipConcierge: { type: Boolean, default: false },
    eligibilityChecker: { type: Boolean, default: false },
    creditMonitoring: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<ISubscriptionPlan>(
  "SubscriptionPlan",
  SubscriptionPlanSchema
);
