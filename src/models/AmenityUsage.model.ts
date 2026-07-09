import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAmenityUsage extends Document {
  bookingId: mongoose.Types.ObjectId;
  hotelId: mongoose.Types.ObjectId;
  hotelName: string;
  serviceId: mongoose.Types.ObjectId;
  serviceName: string;
  unitPrice: number;
  quantity: number;
  discountType?: 'flat' | 'percent';
  discountValue: number;
  amount: number;
  usedAt: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const amenityUsageSchema = new Schema<IAmenityUsage>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    hotelName: { type: String, required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    serviceName: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    discountType: { type: String, enum: ['flat', 'percent'] },
    discountValue: { type: Number, default: 0, min: 0 },
    amount: { type: Number, required: true },
    usedAt: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true }
);

const AmenityUsage: Model<IAmenityUsage> = mongoose.models.AmenityUsage || mongoose.model<IAmenityUsage>('AmenityUsage', amenityUsageSchema);
export default AmenityUsage;
