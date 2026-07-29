import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICustomRate {
  startDate: Date;
  endDate: Date;
  price: number;
}

export interface IMealPackage {
  name: string;
  price: number;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

export interface IRoom extends Document {
  hotelId: mongoose.Types.ObjectId;
  hotelName: string;
  type: string;
  bedType: string;
  price: number;
  weekendRate?: number;
  customRates: ICustomRate[];
  mealPackages: IMealPackage[];
  capacityAdults: number;
  capacityKids: number;
  hasMattressOption: boolean;
  mattressPrice: number;
  description: string;
  amenities: string[];
  innerImages: string[];
  outerImages: string[];
  washroomImages: string[];
  status: 'available' | 'occupied' | 'maintenance';
  size: number;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    hotelName: { type: String, required: true },
    type: { type: String, trim: true, default: 'Standard' },
    bedType: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 },
    weekendRate: { type: Number, min: 0 },
    customRates: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    mealPackages: [
      {
        name: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },
        breakfast: { type: Boolean, default: false },
        lunch: { type: Boolean, default: false },
        dinner: { type: Boolean, default: false },
      },
    ],
    capacityAdults: { type: Number, default: 2, min: 1 },
    capacityKids: { type: Number, default: 0, min: 0 },
    hasMattressOption: { type: Boolean, default: false },
    mattressPrice: { type: Number, default: 1000, min: 0 },
    description: { type: String, default: '' },
    amenities: [{ type: String }],
    innerImages: [{ type: String }],
    outerImages: [{ type: String }],
    washroomImages: [{ type: String }],
    status: { type: String, enum: ['available', 'occupied', 'maintenance'], default: 'available' },
    size: { type: Number, default: 30 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const Room: Model<IRoom> = mongoose.models.Room || mongoose.model<IRoom>('Room', roomSchema);
export default Room;
