import mongoose, { Schema, Document, Model } from 'mongoose';

export type DietaryTag = 'veg' | 'non-veg' | 'vegan' | 'gluten-free' | 'jain' | 'contains-nuts';

export interface IMenuItem extends Document {
  hotelId: mongoose.Types.ObjectId;
  hotelName: string;
  name: string;
  category: string;
  price: number;
  image?: string;
  dietaryTags: DietaryTag[];
  isAvailable: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const menuItemSchema = new Schema<IMenuItem>(
  {
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    hotelName: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String },
    dietaryTags: [{ type: String, enum: ['veg', 'non-veg', 'vegan', 'gluten-free', 'jain', 'contains-nuts'] }],
    isAvailable: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

const MenuItem: Model<IMenuItem> = mongoose.models.MenuItem || mongoose.model<IMenuItem>('MenuItem', menuItemSchema);
export default MenuItem;
