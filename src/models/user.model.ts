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
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    password: { type: String, required: true },
    middleName: { type: String },
    dateOfBirth: { type: Date },
    nationalId: { type: String },
    market: { type: String, default: 'Ghana' },
    role: { type: String, default: 'Customer' },
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
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
