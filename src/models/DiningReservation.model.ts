import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDiningReservation extends Document {
  hotelId: mongoose.Types.ObjectId;
  hotelName: string;
  venueId: mongoose.Types.ObjectId;
  venueName: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  message?: string;
  status: 'pending' | 'contacted' | 'confirmed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const diningReservationSchema = new Schema<IDiningReservation>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    hotelName: { type: String, required: true },
    venueId: { type: Schema.Types.ObjectId, ref: 'RestaurantVenue', required: true },
    venueName: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    guests: { type: Number, required: true, min: 1 },
    message: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'contacted', 'confirmed', 'cancelled'], default: 'pending' },
  },
  { timestamps: true }
);

const DiningReservation: Model<IDiningReservation> =
  mongoose.models.DiningReservation || mongoose.model<IDiningReservation>('DiningReservation', diningReservationSchema);
export default DiningReservation;
