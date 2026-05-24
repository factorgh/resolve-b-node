import mongoose, { Schema, Document } from "mongoose";

export interface IBillingFeePlan extends Document {
  name: string;
  description?: string;
  amount: number;
  currency: string;
  billingCycle: "monthly" | "annually";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BillingFeePlanSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: "GHS" },
    billingCycle: {
      type: String,
      enum: ["monthly", "annually"],
      default: "monthly",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model<IBillingFeePlan>(
  "BillingFeePlan",
  BillingFeePlanSchema,
);
