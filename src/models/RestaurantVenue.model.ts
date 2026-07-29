import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMealPeriod {
  label: string;
  timings: string[];
}

export interface IRestaurantVenue extends Document {
  hotelId: mongoose.Types.ObjectId;
  hotelName: string;
  name: string;
  tags: string[];
  bannerImage?: string;
  images: string[];
  menuPdf?: string;
  mealPeriods: IMealPeriod[];
  address?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const mealPeriodSchema = new Schema<IMealPeriod>(
  {
    label: { type: String, required: true, trim: true },
    timings: [{ type: String, trim: true }],
  },
  { _id: false }
);

const restaurantVenueSchema = new Schema<IRestaurantVenue>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    hotelName: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    tags: [{ type: String, trim: true }],
    bannerImage: { type: String },
    images: [{ type: String }],
    menuPdf: { type: String },
    mealPeriods: [mealPeriodSchema],
    address: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const RestaurantVenue: Model<IRestaurantVenue> =
  mongoose.models.RestaurantVenue || mongoose.model<IRestaurantVenue>('RestaurantVenue', restaurantVenueSchema);
export default RestaurantVenue;
