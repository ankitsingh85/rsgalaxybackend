import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  type: 'flat' | 'percent';
  value: number;
  validFrom: Date;
  validUntil: Date;
  minBookingAmount: number;
  usageLimit: number;
  usedCount: number;
  revenueImpact: number;
  totalBookingRevenue: number;
  visibility: 'public' | 'targeted';
  targetUserIds: mongoose.Types.ObjectId[];
  isActive: boolean;
  deactivatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['flat', 'percent'], required: true },
    value: { type: Number, required: true, min: 0 },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    minBookingAmount: { type: Number, default: 0, min: 0 },
    usageLimit: { type: Number, default: 1, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    revenueImpact: { type: Number, default: 0, min: 0 },
    totalBookingRevenue: { type: Number, default: 0, min: 0 },
    // 'targeted' coupons are only visible/usable by the specific users in targetUserIds —
    // lets an admin hand a discount to a chosen guest without publishing it to everyone.
    visibility: { type: String, enum: ['public', 'targeted'], default: 'public' },
    targetUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
    deactivatedAt: { type: Date },
  },
  { timestamps: true }
);

couponSchema.index({ isActive: 1, validUntil: 1 });

const Coupon: Model<ICoupon> = mongoose.models.Coupon || mongoose.model<ICoupon>('Coupon', couponSchema);
export default Coupon;
