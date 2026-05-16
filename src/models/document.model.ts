import mongoose, { Schema, Document } from 'mongoose';

export interface IUserDocument extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  documentUrl: string;
  documentNumber?: string;
  expiryDate?: Date;
  isVerified: boolean;
  verificationNotes?: string;
  uploadedAt: Date;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
}

const UserDocumentSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    documentUrl: { type: String, required: true },
    documentNumber: { type: String },
    expiryDate: { type: Date },
    isVerified: { type: Boolean, default: false },
    verificationNotes: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model<IUserDocument>('UserDocument', UserDocumentSchema);
