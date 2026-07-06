import { Router } from 'express';
import { getAuditLogs } from '../controller/audit.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, authorize('admin'), getAuditLogs);

export default router;
