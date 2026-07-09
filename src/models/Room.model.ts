import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICustomRate {
  startDate: Date;
  endDate: Date;
  price: number;
}

export interface IRoom extends Document {
  hotelId: mongoose.Types.ObjectId;
  hotelName: string;
  roomNumber: string;
  type: 'standard' | 'deluxe' | 'suite' | 'presidential';
  price: number;
  weekendRate?: number;
  customRates: ICustomRate[];
  capacity: number;
  description: string;
  amenities: string[];
  images: string[];
  status: 'available' | 'occupied' | 'maintenance';
  floor: number;
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
    roomNumber: { type: String, required: true },
    type: { type: String, enum: ['standard','deluxe','suite','presidential'], default: 'standard' },
    price: { type: Number, required: true, min: 0 },
    weekendRate: { type: Number, min: 0 },
    customRates: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    capacity: { type: Number, default: 2, min: 1 },
    description: { type: String, default: '' },
    amenities: [{ type: String }],
    images: [{ type: String }],
    status: { type: String, enum: ['available','occupied','maintenance'], default: 'available' },
    floor: { type: Number, default: 1 },
    size: { type: Number, default: 30 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

roomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });

const Room: Model<IRoom> = mongoose.models.Room || mongoose.model<IRoom>('Room', roomSchema);
export default Room;
