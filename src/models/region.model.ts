import mongoose, { Schema, Document } from 'mongoose';

export interface IRegion extends Document {
  name: string;
  code: string; // e.g. ACC, ASH, NOR
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RegionSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model<IRegion>('Region', RegionSchema);
