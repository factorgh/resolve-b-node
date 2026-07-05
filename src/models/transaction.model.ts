import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  applicationId?: mongoose.Types.ObjectId;
  institutionId?: mongoose.Types.ObjectId;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string; // Loan, Insurance, BNPL, Income, Adjustment, etc.
  status: 'Completed' | 'Pending' | 'Failed';
  reference: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application' },
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution' },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    category: { type: String, required: true },
    status: { type: String, enum: ['Completed', 'Pending', 'Failed'], default: 'Completed' },
    reference: { type: String, unique: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ institutionId: 1, date: -1 });
TransactionSchema.index({ applicationId: 1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
