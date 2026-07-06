import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBooking extends Document {
  bookingRef: string;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  hotelId: mongoose.Types.ObjectId;
  hotelName: string;
  roomId: mongoose.Types.ObjectId;
  roomNumber: string;
  roomType: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalPrice: number;
  couponCode?: string;
  discountAmount?: number;
  status: 'pending' | 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  specialRequests?: string;
  createdAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    bookingRef: { type: String, unique: true, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    hotelName: { type: String, required: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    roomNumber: { type: String, required: true },
    roomType: { type: String, required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: { type: Number, default: 1 },
    totalPrice: { type: Number, required: true },
    couponCode: { type: String, uppercase: true, trim: true },
    discountAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending','confirmed','checked-in','checked-out','cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending','paid','refunded'],
      default: 'pending',
    },
    specialRequests: { type: String },
  },
  { timestamps: true }
);

const Booking: Model<IBooking> = mongoose.models.Booking || mongoose.model<IBooking>('Booking', bookingSchema);
export default Booking;
