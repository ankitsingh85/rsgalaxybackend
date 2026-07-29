import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExtraService {
  serviceId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  addedAt: Date;
}

export interface IMealPlanSnapshot {
  name: string;
  price: number;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

export interface IBooking extends Document {
  bookingRef: string;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  hotelId: mongoose.Types.ObjectId;
  hotelName: string;
  roomId: mongoose.Types.ObjectId;
  roomType: string;
  mealPlans: IMealPlanSnapshot[];
  checkIn: Date;
  checkOut: Date;
  guests: number;
  mattressAdded?: boolean;
  mattressCostPerNight?: number;
  totalPrice: number;
  couponCode?: string;
  discountAmount?: number;
  status: 'pending' | 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  specialRequests?: string;
  extraServices: IExtraService[];
  checkInActualAt?: Date;
  checkOutActualAt?: Date;
  cancellationReason?: string;
  cancelledAt?: Date;
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
    roomType: { type: String, required: true },
    mealPlans: [
      {
        name: { type: String },
        price: { type: Number },
        breakfast: { type: Boolean },
        lunch: { type: Boolean },
        dinner: { type: Boolean },
      },
    ],
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: { type: Number, default: 1 },
    mattressAdded: { type: Boolean, default: false },
    mattressCostPerNight: { type: Number, default: 0 },
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
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    specialRequests: { type: String },
    extraServices: [
      {
        serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    checkInActualAt: { type: Date },
    checkOutActualAt: { type: Date },
    cancellationReason: { type: String },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

const Booking: Model<IBooking> = mongoose.models.Booking || mongoose.model<IBooking>('Booking', bookingSchema);
export default Booking;
