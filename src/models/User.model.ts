import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'user';
  phone?: string;
  avatar?: string;
  managedHotelId?: mongoose.Types.ObjectId;
  isActive: boolean;

  // ── NEW: Password reset fields ──
  resetOTP?: string;
  resetOTPExpiry?: Date;
  passwordChangedAt?: Date;

  // ── Customer management fields ──
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  isBanned: boolean;
  banReason?: string;
  bannedAt?: Date;
  bannedBy?: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'user'],
      default: 'user',
    },
    phone: { type: String },
    avatar: { type: String },
    managedHotelId: { type: Schema.Types.ObjectId, ref: 'Hotel' },
    isActive: { type: Boolean, default: true },

    // ── NEW: For password reset OTP ──
    resetOTP: { type: String, select: false },
    resetOTPExpiry: { type: Date, select: false },
    passwordChangedAt: { type: Date },

    // ── Customer management fields ──
    kycStatus: { type: String, enum: ['unverified', 'pending', 'verified', 'rejected'], default: 'unverified' },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String },
    bannedAt: { type: Date },
    bannedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ── Hash password before save (bcrypt with 12 rounds) ──
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  // Update password changed timestamp
  if (!this.isNew) {
    this.passwordChangedAt = new Date();
  }

  next();
});

// ── Compare password method ──
userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
export default User;