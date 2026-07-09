import mongoose, { Schema, Document, Model } from 'mongoose';

export type StaffRole = 'manager' | 'housekeeping' | 'receptionist' | 'chef';

export interface IStaff extends Document {
  name: string;
  email: string;
  phone?: string;
  staffRole: StaffRole;
  department: string;
  hotelId: mongoose.Types.ObjectId;
  hotelName: string;
  credentialRef?: string;
  shiftName?: string;
  workingDays: string[];
  isActive: boolean;
  offboardedAt?: Date;
  offboardReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const staffSchema = new Schema<IStaff>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String },
    staffRole: { type: String, enum: ['manager', 'housekeeping', 'receptionist', 'chef'], required: true },
    department: { type: String, required: true, trim: true },
    hotelId: { type: Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    hotelName: { type: String, required: true },
    credentialRef: { type: String },
    shiftName: { type: String },
    workingDays: [{ type: String, enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }],
    isActive: { type: Boolean, default: true },
    offboardedAt: { type: Date },
    offboardReason: { type: String },
  },
  { timestamps: true }
);

const Staff: Model<IStaff> = mongoose.models.Staff || mongoose.model<IStaff>('Staff', staffSchema);
export default Staff;
