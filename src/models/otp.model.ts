import mongoose, { Schema, Document } from 'mongoose';

export interface IOtp extends Document {
  phoneNumber: string;
  code: string;
  expiresAt: Date;
  createdAt: Date;
}

const OtpSchema = new Schema({
  phoneNumber: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true }
});

OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IOtp>('Otp', OtpSchema);
