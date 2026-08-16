import mongoose, { Schema, Document } from "mongoose";

export interface IVehicleUploadToken extends Document {
  tokenHash: string;
  dealerName: string;
  dealerCompany: string;
  dealerPhone?: string;
  dealerEmail?: string;
  expiresAt: Date;
  maxUploads: number;
  usedCount: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleUploadTokenSchema: Schema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    dealerName: { type: String, required: true },
    dealerCompany: { type: String, required: true },
    dealerPhone: { type: String, default: "" },
    dealerEmail: { type: String, default: "" },
    expiresAt: { type: Date, required: true },
    maxUploads: { type: Number, default: 20 },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

VehicleUploadTokenSchema.index({ expiresAt: 1 });

export default mongoose.model<IVehicleUploadToken>(
  "VehicleUploadToken",
  VehicleUploadTokenSchema,
);
