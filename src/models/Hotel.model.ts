import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHotel extends Document {
  name: string;
  slug: string;
  location: string;
  city: string;
  country: string;
  contact?: string;
  latitude?: number;
  longitude?: number;
  description: string;
  rating: number;
  image?: string;
  images: string[];
  amenities: string[];
  totalRooms: number;
  priceRange: string;
  managerId?: mongoose.Types.ObjectId;
  managerName?: string;
  status: 'active' | 'inactive' | 'suspended';
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const hotelSchema = new Schema<IHotel>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true },
    location: { type: String, required: true },
    city: { type: String, required: true, index: true },
    country: { type: String, default: 'India' },
    contact: { type: String },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    description: { type: String, required: true },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    image: { type: String },
    images: [{ type: String }],
    amenities: [{ type: String }],
    totalRooms: { type: Number, default: 0 },
    priceRange: { type: String, default: '₹5,000 - ₹25,000' },
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    managerName: { type: String },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

hotelSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

const Hotel: Model<IHotel> = mongoose.models.Hotel || mongoose.model<IHotel>('Hotel', hotelSchema);
export default Hotel;
