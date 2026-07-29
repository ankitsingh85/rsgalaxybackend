import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRoomType extends Document {
  name: string;
  bedType?: string;
  size?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roomTypeSchema = new Schema<IRoomType>(
  {
    name: { type: String, required: true, trim: true },
    bedType: { type: String, trim: true },
    size: { type: Number, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const RoomType: Model<IRoomType> = mongoose.models.RoomType || mongoose.model<IRoomType>('RoomType', roomTypeSchema);
export default RoomType;
