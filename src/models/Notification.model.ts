import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationTargetType = 'all' | 'users' | 'hotels';
export type NotificationChannel = 'push' | 'email';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationRecipientType = 'user' | 'hotel';

export interface INotificationRecipient {
  recipientType: NotificationRecipientType;
  recipientId: mongoose.Types.ObjectId;
  name?: string;
  email?: string;
  readAt?: Date;
  snoozedUntil?: Date;
}

export interface IAdminSnooze {
  adminId: mongoose.Types.ObjectId;
  until: Date;
}

export interface INotification extends Document {
  title: string;
  message: string;
  targetType: NotificationTargetType;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  recipients: INotificationRecipient[];
  targetUserIds: mongoose.Types.ObjectId[];
  targetHotelIds: mongoose.Types.ObjectId[];
  emailSentCount: number;
  pushQueuedCount: number;
  readByAdminIds: mongoose.Types.ObjectId[];
  adminSnoozes: IAdminSnooze[];
  createdBy?: mongoose.Types.ObjectId;
  createdByName?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const recipientSchema = new Schema<INotificationRecipient>(
  {
    recipientType: { type: String, enum: ['user', 'hotel'], required: true },
    recipientId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String },
    email: { type: String },
    readAt: { type: Date },
    snoozedUntil: { type: Date },
  },
  { _id: false }
);

const adminSnoozeSchema = new Schema<IAdminSnooze>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    until: { type: Date, required: true },
  },
  { _id: false }
);

const notificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    targetType: { type: String, enum: ['all', 'users', 'hotels'], required: true, index: true },
    channels: [{ type: String, enum: ['push', 'email'], required: true }],
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal', index: true },
    recipients: [recipientSchema],
    targetUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    targetHotelIds: [{ type: Schema.Types.ObjectId, ref: 'Hotel' }],
    emailSentCount: { type: Number, default: 0 },
    pushQueuedCount: { type: Number, default: 0 },
    readByAdminIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    adminSnoozes: [adminSnoozeSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdByName: { type: String },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });
notificationSchema.index({ title: 'text', message: 'text' });

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
