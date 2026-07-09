import { Router } from 'express';
import { getUsage, createUsage, updateUsage, deleteUsage } from '../controller/amenityUsage.controller';
import { authenticate, authorize, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'manager'));
router.get('/', requirePermission('amenities', 'view'), getUsage);
router.post('/', requirePermission('amenities', 'edit'), createUsage);
router.put('/:id', requirePermission('amenities', 'edit'), updateUsage);
router.delete('/:id', requirePermission('amenities', 'delete'), deleteUsage);

export default router;
