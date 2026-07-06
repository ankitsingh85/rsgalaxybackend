import { Router } from 'express';
import { getCoupons, createCoupon, updateCoupon, deactivateCoupon } from '../controller/coupon.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', authorize('admin'), getCoupons);
router.post('/', authorize('admin'), createCoupon);
router.put('/:id', authorize('admin'), updateCoupon);
router.delete('/:id', authorize('admin'), deactivateCoupon);

export default router;
