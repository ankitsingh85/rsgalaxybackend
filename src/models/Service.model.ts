import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IService extends Document {
  hotelId: mongoose.Types.ObjectId;
  hotelName: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    hotelName: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String },
    image: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Service: Model<IService> = mongoose.models.Service || mongoose.model<IService>('Service', serviceSchema);
export default Service;
