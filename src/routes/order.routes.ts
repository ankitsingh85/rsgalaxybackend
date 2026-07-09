import { Router } from 'express';
import { getOrders, createOrder, updateOrder } from '../controller/order.controller';
import { authenticate, authorize, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', authorize('admin', 'manager'), requirePermission('restaurant', 'view'), getOrders);
router.post('/', authorize('admin', 'manager'), requirePermission('restaurant', 'edit'), createOrder);
router.put('/:id', authorize('admin', 'manager'), requirePermission('restaurant', 'edit'), updateOrder);

export default router;
