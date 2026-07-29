import { Router } from 'express';
import { getCoupons, getPublicCoupons, createCoupon, updateCoupon, deactivateCoupon, validateCoupon } from '../controller/coupon.controller';
import { authenticate, optionalAuthenticate, authorize, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.get('/public', optionalAuthenticate, getPublicCoupons);

router.use(authenticate);
router.post('/validate', validateCoupon);
router.get('/', authorize('admin', 'manager'), requirePermission('coupons', 'view'), getCoupons);
router.post('/', authorize('admin', 'manager'), requirePermission('coupons', 'edit'), createCoupon);
router.put('/:id', authorize('admin', 'manager'), requirePermission('coupons', 'edit'), updateCoupon);
router.delete('/:id', authorize('admin', 'manager'), requirePermission('coupons', 'delete'), deactivateCoupon);

export default router;
