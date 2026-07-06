import { Router } from 'express';
import {
  cleanupNotifications,
  createNotification,
  deleteNotification,
  getAdminNotifications,
  getMyNotifications,
  markMyNotificationRead,
  markNotificationsRead,
  snoozeNotifications,
} from '../controller/notification.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/my', authorize('user'), getMyNotifications);
router.put('/my/:id/read', authorize('user'), markMyNotificationRead);

router.use(authorize('admin'));
router.get('/', getAdminNotifications);
router.post('/', createNotification);
router.put('/mark-read', markNotificationsRead);
router.put('/snooze', snoozeNotifications);
router.delete('/cleanup', cleanupNotifications);
router.delete('/:id', deleteNotification);

export default router;
