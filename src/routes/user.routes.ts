import { Router } from 'express';
import {
  getUsers, getDeletedUsers, createManager, createAdmin, createCustomer, getAdmins,
  updateUser, deleteUser, toggleUserStatus, resetUserPassword, banUser, unbanUser,
  softDeleteUser, restoreUser, uploadGuestId, anonymizeUser,
} from '../controller/user.controller';
import { authenticate, authorize, requirePermission } from '../middleware/auth.middleware';
import { uploadImages } from '../middleware/upload.middleware';

const router = Router();

router.use(authenticate);

// All users (admin/manager, gated by 'customers' permission)
router.get('/', authorize('admin', 'manager'), requirePermission('customers', 'view'), getUsers);
router.get('/deleted', authorize('admin', 'manager'), requirePermission('customers', 'view'), getDeletedUsers);

// Admin management — always admin-only, not part of the manager permission matrix
router.get('/admins', authorize('admin'), getAdmins);
router.post('/admin', authorize('admin'), createAdmin);

// Manager management — always admin-only
router.post('/manager', authorize('admin'), createManager);

// Customer management
router.post('/customer', authorize('admin', 'manager'), requirePermission('customers', 'edit'), createCustomer);
router.post('/upload-id', authorize('admin', 'manager'), requirePermission('customers', 'edit'), uploadImages.single('idDocument'), uploadGuestId);

// Update / Delete / Toggle Status
router.put('/:id/toggle-status', authorize('admin', 'manager'), requirePermission('customers', 'edit'), toggleUserStatus);
router.put('/:id/reset-password', authorize('admin', 'manager'), requirePermission('customers', 'edit'), resetUserPassword);
router.put('/:id/ban', authorize('admin', 'manager'), requirePermission('customers', 'edit'), banUser);
router.put('/:id/unban', authorize('admin', 'manager'), requirePermission('customers', 'edit'), unbanUser);
router.put('/:id/soft-delete', authorize('admin', 'manager'), requirePermission('customers', 'delete'), softDeleteUser);
router.put('/:id/restore', authorize('admin', 'manager'), requirePermission('customers', 'edit'), restoreUser);
router.put('/:id/anonymize', authorize('admin', 'manager'), requirePermission('customers', 'delete'), anonymizeUser);
router.put('/:id', authorize('admin', 'manager'), requirePermission('customers', 'edit'), updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

export default router;
