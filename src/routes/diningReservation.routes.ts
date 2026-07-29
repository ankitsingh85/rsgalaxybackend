import { Router } from 'express';
import { submitReservation, getReservations, updateReservation } from '../controller/diningReservation.controller';
import { authenticate, authorize, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.post('/', submitReservation);

router.use(authenticate);
router.get('/', authorize('admin', 'manager'), requirePermission('restaurant', 'view'), getReservations);
router.put('/:id', authorize('admin', 'manager'), requirePermission('restaurant', 'edit'), updateReservation);

export default router;
