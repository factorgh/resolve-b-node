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
  },
  { timestamps: true }
);

export default mongoose.model<IInstitution>('Institution', InstitutionSchema);
