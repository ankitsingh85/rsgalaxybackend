import { Router } from 'express';
import { getBookings, createBooking, updateBooking, deleteBooking } from '../controller/booking.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', getBookings);
router.post('/', createBooking);
router.put('/:id', updateBooking);
router.delete('/:id', authorize('admin'), deleteBooking);

export default router;
