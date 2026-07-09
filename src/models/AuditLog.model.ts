import mongoose, { Schema, Document, Model } from 'mongoose';

export type AuditAction = 'create' | 'update' | 'soft-delete' | 'restore' | 'hard-delete' | 'bulk-status-update' | 'bulk-price-update' | 'ban' | 'unban' | 'password-reset' | 'anonymize';

export interface IAuditLog extends Document {
  action: AuditAction;
  entityType: string;
  entityId: mongoose.Types.ObjectId;
  entityName?: string;
  performedBy: mongoose.Types.ObjectId;
  performedByName: string;
  performedByRole: string;
  meta?: any;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      enum: ['create', 'update', 'soft-delete', 'restore', 'hard-delete', 'bulk-status-update', 'bulk-price-update', 'ban', 'unban', 'password-reset', 'anonymize'],
      required: true,
    },
    entityType: { type: String, required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, index: true },
    entityName: { type: String },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    performedByName: { type: String, required: true },
    performedByRole: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
export default AuditLog;
