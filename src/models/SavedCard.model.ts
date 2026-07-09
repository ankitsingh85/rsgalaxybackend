import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISavedCard extends Document {
  userId: mongoose.Types.ObjectId;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName: string;
  createdAt: Date;
}

const savedCardSchema = new Schema<ISavedCard>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    brand: { type: String, required: true, trim: true },
    last4: { type: String, required: true, match: [/^\d{4}$/, 'last4 must be exactly 4 digits'] },
    expiryMonth: { type: Number, required: true, min: 1, max: 12 },
    expiryYear: { type: Number, required: true, min: new Date().getFullYear() },
    cardholderName: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const SavedCard: Model<ISavedCard> = mongoose.models.SavedCard || mongoose.model<ISavedCard>('SavedCard', savedCardSchema);
export default SavedCard;
