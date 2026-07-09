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
import { authenticate, authorize, requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/my', authorize('user'), getMyNotifications);
router.put('/my/:id/read', authorize('user'), markMyNotificationRead);

router.use(authorize('admin', 'manager'));
router.get('/', requirePermission('notifications', 'view'), getAdminNotifications);
router.post('/', requirePermission('notifications', 'edit'), createNotification);
router.put('/mark-read', requirePermission('notifications', 'edit'), markNotificationsRead);
router.put('/snooze', requirePermission('notifications', 'edit'), snoozeNotifications);
router.delete('/cleanup', requirePermission('notifications', 'delete'), cleanupNotifications);
router.delete('/:id', requirePermission('notifications', 'delete'), deleteNotification);

export default router;
