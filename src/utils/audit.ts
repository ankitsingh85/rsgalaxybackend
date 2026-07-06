import AuditLog, { AuditAction } from '../models/AuditLog.model';
import User from '../models/User.model';
import { AuthRequest } from '../middleware/auth.middleware';

interface LogAuditParams {
  action: AuditAction;
  entityType: string;
  entityId: string;
  entityName?: string;
  req: AuthRequest;
  meta?: any;
}

export const logAudit = async ({ action, entityType, entityId, entityName, req, meta }: LogAuditParams): Promise<void> => {
  if (!req.user) return;
  const performer = await User.findById(req.user.id).select('name').lean();
  await AuditLog.create({
    action,
    entityType,
    entityId,
    entityName,
    performedBy: req.user.id,
    performedByName: performer?.name || req.user.email,
    performedByRole: req.user.role,
    meta,
  });
};
