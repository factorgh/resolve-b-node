import mongoose, { Schema, Document } from 'mongoose';

export interface IInstitution extends Document {
  name: string;
  legalName: string;
  type: string;
  registrationNumber: string;
  taxId: string;
  email: string;
  phoneNumber: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  isActive: boolean;
  isVerified: boolean;
  creditLimit?: number;
  currentCreditUsed?: number;
  subscriptionFee: number;
  billingCycle: 'monthly' | 'annually';
  billingStatus: 'Active' | 'Delinquent' | 'Unpaid';
  nextBillingDate: Date;
  lastBillingDate: Date;
  coreBankingApiUrl?: string;
  coreBankingWebhookSecret?: string;
  coreBankingAutoDisburse: boolean;
  coreBankingAuthToken?: string;
  interestRepaymentFrequency: 'weekly' | 'monthly' | 'annually';
  createdAt: Date;
  updatedAt: Date;
}

const InstitutionSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    legalName: { type: String, required: true },
    type: { type: String, required: true }, // Bank, Microfinance, Insurance, Merchant, Fintech
    registrationNumber: { type: String, required: true },
    taxId: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    website: { type: String },
    logoUrl: { type: String },
    description: { type: String },
    streetAddress: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    postalCode: { type: String },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    creditLimit: { type: Number },
    currentCreditUsed: { type: Number, default: 0 },
    subscriptionFee: { type: Number, default: 500 }, // Default GH₵ 500 monthly fee
    billingCycle: { type: String, enum: ['monthly', 'annually'], default: 'monthly' },
    billingStatus: { type: String, enum: ['Active', 'Delinquent', 'Unpaid'], default: 'Active' },
    nextBillingDate: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, // 30 days from now
    lastBillingDate: { type: Date, default: Date.now },
    coreBankingApiUrl: { type: String, default: 'https://api.sim-bank.resolvebridge.com/v1' },
    coreBankingWebhookSecret: { type: String, default: '' },
    coreBankingAutoDisburse: { type: Boolean, default: false },
    coreBankingAuthToken: { type: String, default: '' },
    interestRepaymentFrequency: { type: String, enum: ['weekly', 'monthly', 'annually'], default: 'monthly' },
  },
  { timestamps: true }
);

export default mongoose.model<IInstitution>('Institution', InstitutionSchema);
