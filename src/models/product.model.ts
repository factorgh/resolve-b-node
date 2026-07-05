import mongoose, { Schema, Document } from "mongoose";

export interface IFinancialProduct extends Document {
  name: string;
  description: string;
  productType: string; // Loan, BNPL, Insurance
  institutionId: mongoose.Types.ObjectId;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  minTenureMonths: number;
  maxTenureMonths: number;
  requirements: string;
  benefits: string;
  termsAndConditions: string;
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
  imageUrl?: string;
  isBlacklisted: boolean;
  blacklistReason?: string;
  blacklistedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FinancialProductSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    productType: { type: String, required: true },
    institutionId: {
      type: Schema.Types.ObjectId,
      ref: "Institution",
      required: true,
    },
    minAmount: { type: Number, required: true },
    maxAmount: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    minTenureMonths: { type: Number, required: true },
    maxTenureMonths: { type: Number, required: true },
    requirements: { type: String, required: true },
    benefits: { type: String, required: true },
    termsAndConditions: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
    imageUrl: { type: String, default: "" },
    isBlacklisted: { type: Boolean, default: false },
    blacklistReason: { type: String, default: "" },
    blacklistedAt: { type: Date },
  },
  { timestamps: true },
);

FinancialProductSchema.index({ institutionId: 1, isActive: 1 });
FinancialProductSchema.index({ productType: 1, isActive: 1, isBlacklisted: 1 });

export default mongoose.model<IFinancialProduct>(
  "FinancialProduct",
  FinancialProductSchema,
);
