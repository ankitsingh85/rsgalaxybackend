import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRoom extends Document {
  hotelId: mongoose.Types.ObjectId;
  hotelName: string;
  roomNumber: string;
  type: 'standard' | 'deluxe' | 'suite' | 'presidential';
  price: number;
  capacity: number;
  description: string;
  amenities: string[];
  images: string[];
  status: 'available' | 'occupied' | 'maintenance';
  floor: number;
  size: number;
  createdAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    hotelName: { type: String, required: true },
    roomNumber: { type: String, required: true },
    type: { type: String, enum: ['standard','deluxe','suite','presidential'], default: 'standard' },
    price: { type: Number, required: true, min: 0 },
    capacity: { type: Number, default: 2, min: 1 },
    description: { type: String, default: '' },
    amenities: [{ type: String }],
    images: [{ type: String }],
    status: { type: String, enum: ['available','occupied','maintenance'], default: 'available' },
    floor: { type: Number, default: 1 },
    size: { type: Number, default: 30 },
  },
  { timestamps: true }
);

roomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });

const Room: Model<IRoom> = mongoose.models.Room || mongoose.model<IRoom>('Room', roomSchema);
export default Room;
