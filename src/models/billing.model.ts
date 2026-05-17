import mongoose, { Schema, Document } from 'mongoose';

export interface IBillingInvoice extends Document {
  institutionId: mongoose.Types.ObjectId;
  amount: number;
  dueDate: Date;
  status: 'Paid' | 'Unpaid' | 'Overdue';
  reference: string;
  billingDate: Date;
  paidAt?: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BillingInvoiceSchema: Schema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['Paid', 'Unpaid', 'Overdue'], default: 'Unpaid' },
    reference: { type: String, unique: true, required: true },
    billingDate: { type: Date, default: Date.now },
    paidAt: { type: Date },
    description: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IBillingInvoice>('BillingInvoice', BillingInvoiceSchema);
