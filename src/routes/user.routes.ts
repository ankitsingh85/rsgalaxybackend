import { Router } from 'express';
import {
  getUsers, getDeletedUsers, createManager, createAdmin, createCustomer, getAdmins,
  updateUser, deleteUser, toggleUserStatus, resetUserPassword, banUser, unbanUser,
  softDeleteUser, restoreUser,
} from '../controller/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// All users (admin only)
router.get('/', authorize('admin'), getUsers);
router.get('/deleted', authorize('admin'), getDeletedUsers);

// Admin management
router.get('/admins', authorize('admin'), getAdmins);
router.post('/admin', authorize('admin'), createAdmin);

// Manager management
router.post('/manager', authorize('admin'), createManager);

// Customer management
router.post('/customer', authorize('admin'), createCustomer);

// Update / Delete / Toggle Status
router.put('/:id/toggle-status', authorize('admin'), toggleUserStatus);
router.put('/:id/reset-password', authorize('admin'), resetUserPassword);
router.put('/:id/ban', authorize('admin'), banUser);
router.put('/:id/unban', authorize('admin'), unbanUser);
router.put('/:id/soft-delete', authorize('admin'), softDeleteUser);
router.put('/:id/restore', authorize('admin'), restoreUser);
router.put('/:id', updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

export default router;
