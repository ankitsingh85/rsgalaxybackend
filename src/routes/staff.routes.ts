import { Router } from 'express';
import { getStaff, createStaff, updateStaff, offboardStaff, restoreStaff } from '../controller/staff.controller';
import { authenticate, authorize, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', authorize('admin', 'manager'), requirePermission('staff', 'view'), getStaff);
router.post('/', authorize('admin', 'manager'), requirePermission('staff', 'edit'), createStaff);
router.put('/:id', authorize('admin', 'manager'), requirePermission('staff', 'edit'), updateStaff);
router.put('/:id/offboard', authorize('admin', 'manager'), requirePermission('staff', 'delete'), offboardStaff);
router.put('/:id/restore', authorize('admin', 'manager'), requirePermission('staff', 'edit'), restoreStaff);

export default router;
