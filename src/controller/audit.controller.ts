import { Response, NextFunction } from 'express';
import AuditLog from '../models/AuditLog.model';
import { AuthRequest } from '../middleware/auth.middleware';

// GET /api/audit-logs?entityType=Hotel&entityId=... — admin only
export const getAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { entityType, entityId } = req.query;
    const query: any = {};
    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;

    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, count: logs.length, logs });
  } catch (err) { next(err); }
};
