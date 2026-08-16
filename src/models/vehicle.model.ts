import mongoose, { Schema, Document } from "mongoose";

export interface IVehicleFile {
  url: string;
  name: string;
  type: string;
}

export interface IVehicle extends Document {
  dealerName: string;
  dealerCompany: string;
  dealerPhone?: string;
  dealerEmail?: string;
  make: string;
  vehicleModel: string;
  year: number;
  bodyType: string;
  fuel: string;
  transmission: string;
  mileageKm: number;
  vin?: string;
  condition: string;
  color?: string;
  location: string;
  description?: string;
  dealerPrice: number;
  markup: number;
  customerPrice: number;
  minDownPaymentPercent: number;
  photos: IVehicleFile[];
  documents: IVehicleFile[];
  status: string;
  recommendedInstitutionId?: mongoose.Types.ObjectId;
  financeProductId?: mongoose.Types.ObjectId;
  uploadTokenId?: mongoose.Types.ObjectId;
  reservedByApplicationId?: mongoose.Types.ObjectId;
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  listedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FileSchema = new Schema(
  {
    url: { type: String, required: true },
    name: { type: String, default: "" },
    type: { type: String, default: "other" },
  },
  { _id: false },
);

const VehicleSchema: Schema = new Schema(
  {
    dealerName: { type: String, required: true },
    dealerCompany: { type: String, required: true },
    dealerPhone: { type: String, default: "" },
    dealerEmail: { type: String, default: "" },
    make: { type: String, required: true },
    vehicleModel: { type: String, required: true },
    year: { type: Number, required: true },
    bodyType: { type: String, default: "SUV" },
    fuel: { type: String, default: "Petrol" },
    transmission: { type: String, default: "Auto" },
    mileageKm: { type: Number, default: 0 },
    vin: { type: String, default: "" },
    condition: { type: String, default: "Used" },
    color: { type: String, default: "" },
    location: { type: String, default: "Accra" },
    description: { type: String, default: "" },
    dealerPrice: { type: Number, required: true },
    markup: { type: Number, default: 0 },
    customerPrice: { type: Number, required: true },
    minDownPaymentPercent: { type: Number, default: 10 },
    photos: { type: [FileSchema], default: [] },
    documents: { type: [FileSchema], default: [] },
    status: {
      type: String,
      enum: ["PendingReview", "Listed", "Reserved", "Sold", "Rejected"],
      default: "PendingReview",
    },
    recommendedInstitutionId: { type: Schema.Types.ObjectId, ref: "Institution" },
    financeProductId: { type: Schema.Types.ObjectId, ref: "FinancialProduct" },
    uploadTokenId: { type: Schema.Types.ObjectId, ref: "VehicleUploadToken" },
    reservedByApplicationId: { type: Schema.Types.ObjectId, ref: "Application" },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    listedAt: { type: Date },
    rejectionReason: { type: String, default: "" },
  },
  { timestamps: true },
);

VehicleSchema.index({ status: 1, listedAt: -1 });
VehicleSchema.index({ recommendedInstitutionId: 1, status: 1 });

export default mongoose.model<IVehicle>("Vehicle", VehicleSchema);
