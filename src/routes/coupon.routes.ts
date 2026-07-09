import { Router } from 'express';
import { getCoupons, createCoupon, updateCoupon, deactivateCoupon, validateCoupon } from '../controller/coupon.controller';
import { authenticate, authorize, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.post('/validate', validateCoupon);
router.get('/', authorize('admin', 'manager'), requirePermission('coupons', 'view'), getCoupons);
router.post('/', authorize('admin', 'manager'), requirePermission('coupons', 'edit'), createCoupon);
router.put('/:id', authorize('admin', 'manager'), requirePermission('coupons', 'edit'), updateCoupon);
router.delete('/:id', authorize('admin', 'manager'), requirePermission('coupons', 'delete'), deactivateCoupon);

export default router;
