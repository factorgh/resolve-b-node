import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  adminId: mongoose.Types.ObjectId;
  institutionId?: mongoose.Types.ObjectId;
  action: string; // 'ReviewApplication' | 'VerifyDocument' | 'UpdateUser' | 'CreateProduct'
  targetId?: mongoose.Types.ObjectId; // e.g. Mapped application ID, user ID, or document ID
  details: string; // High-level descriptive text
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution' },
    action: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId },
    details: { type: String, required: true },
    ipAddress: { type: String, default: '127.0.0.1' },
    userAgent: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
