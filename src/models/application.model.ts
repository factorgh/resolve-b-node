import mongoose, { Schema, Document } from 'mongoose';

export interface IApplication extends Document {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  amount: number;
  tenureMonths: number;
  status: string; // Pending, UnderReview, Approved, Rejected, Disbursed, Completed, Cancelled
  applicationData?: any;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'FinancialProduct', required: true },
    amount: { type: Number, required: true },
    tenureMonths: { type: Number, required: true },
    status: { type: String, default: 'Pending' },
    applicationData: { type: Schema.Types.Mixed },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IApplication>('Application', ApplicationSchema);
