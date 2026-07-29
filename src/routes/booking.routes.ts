import { Router } from 'express';
import {
  getBookings, createBooking, createRazorpayOrder, updateBooking, deleteBooking,
  checkInBooking, checkOutBooking, cancelBooking,
  rescheduleMyBooking, downloadInvoice,
} from '../controller/booking.controller';
import { authenticate, authorize, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', requirePermission('bookings', 'view'), getBookings);
router.post('/razorpay-order', createRazorpayOrder);
router.post('/', requirePermission('bookings', 'edit'), createBooking);
router.put('/:id', authorize('admin', 'manager'), requirePermission('bookings', 'edit'), updateBooking);
router.put('/:id/check-in', authorize('admin', 'manager'), requirePermission('bookings', 'edit'), checkInBooking);
router.put('/:id/check-out', authorize('admin', 'manager'), requirePermission('bookings', 'edit'), checkOutBooking);
router.put('/:id/cancel', requirePermission('bookings', 'delete'), cancelBooking);
router.put('/:id/reschedule', requirePermission('bookings', 'edit'), rescheduleMyBooking);
router.get('/:id/invoice', requirePermission('bookings', 'view'), downloadInvoice);
router.delete('/:id', authorize('admin'), deleteBooking);

export default router;
