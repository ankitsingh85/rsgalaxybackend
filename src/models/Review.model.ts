import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReview extends Document {
  bookingId: mongoose.Types.ObjectId;
  hotelId: mongoose.Types.ObjectId;
  hotelName: string;
  userId: mongoose.Types.ObjectId;
  userName: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    hotelName: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
  },
  { timestamps: true }
);

const Review: Model<IReview> = mongoose.models.Review || mongoose.model<IReview>('Review', reviewSchema);
export default Review;
