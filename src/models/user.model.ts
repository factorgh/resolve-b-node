import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  password: string;
  middleName?: string;
  dateOfBirth?: Date;
  nationalId?: string;
  market: string;
  role: string;
  kycStatus: string;
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt?: Date;
  institutionId?: mongoose.Types.ObjectId;
  regionId?: mongoose.Types.ObjectId;
  // Profile fields
  title?: string;
  maritalStatus?: string;
  gender?: string;
  nationality?: string;
  dependants?: string;
  residentialAddress?: string;
  city?: string;
  mmda?: string;
  landmark?: string;
  employer?: string;
  sector?: string;
  occupation?: string;
  ssnitNo?: string;
  workAddress?: string;
  yearsWithEmployer?: string;
  // Onboarding fields
  goals?: string[];
  employmentStatus?: string;
  monthlyIncome?: string;
  loanDuration?: string;
  idType?: string;
  idNumber?: string;
  creditScore?: number;
  healthIndex?: number;
  cashFlow?: number;
  netWorth?: number;
  healthIndexMessage?: string;
  subscriptionFeePaid?: boolean;
  nextSubscriptionDate?: Date;
  // Premium subscription fields
  subscriptionPlanId?: mongoose.Types.ObjectId;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  mustResetPassword: boolean;
  permissions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    password: { type: String, required: true, select: false },
    middleName: { type: String },
    dateOfBirth: { type: Date },
    nationalId: { type: String },
    market: { type: String, default: 'Ghana' },
    role: { type: String, default: 'Customer' },
    permissions: { type: [String], default: [] },
    kycStatus: { type: String, default: 'Pending' },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution' },
    regionId: { type: Schema.Types.ObjectId, ref: 'Region' },
    // Profile fields
    title: { type: String },
    maritalStatus: { type: String },
    gender: { type: String },
    nationality: { type: String },
    dependants: { type: String },
    residentialAddress: { type: String },
    city: { type: String },
    mmda: { type: String },
    landmark: { type: String },
    employer: { type: String },
    sector: { type: String },
    occupation: { type: String },
    ssnitNo: { type: String },
    workAddress: { type: String },
    yearsWithEmployer: { type: String },
    // Onboarding fields
    goals: { type: [String] },
    employmentStatus: { type: String },
    monthlyIncome: { type: String },
    loanDuration: { type: String },
    idType: { type: String },
    idNumber: { type: String },
    creditScore: { type: Number, default: 650 },
    healthIndex: { type: Number, default: 60 },
    cashFlow: { type: Number, default: 5000 },
    netWorth: { type: Number, default: 15000 },
    healthIndexMessage: { type: String, default: 'Assessment Pending' },
    subscriptionFeePaid: { type: Boolean, default: true },
    nextSubscriptionDate: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    // Premium subscription fields
    subscriptionPlanId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
    subscriptionStartDate: { type: Date },
    subscriptionEndDate: { type: Date },
    mustResetPassword: { type: Boolean, default: false },
  },
  { timestamps: true }
);

UserSchema.index({ institutionId: 1, role: 1 });
UserSchema.index({ regionId: 1 });
UserSchema.index({ role: 1, isActive: 1 });

export default mongoose.model<IUser>('User', UserSchema);
