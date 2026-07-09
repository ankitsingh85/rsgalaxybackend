import { Router } from 'express';
import {
  getMenuItems, getPublicMenuItems, getDeletedMenuItems, createMenuItem, uploadMenuItemImage,
  updateMenuItem, restoreMenuItem, deleteMenuItem,
} from '../controller/menuItem.controller';
import { authenticate, authorize, requirePermission } from '../middleware/auth.middleware';
import { uploadImages } from '../middleware/upload.middleware';

const router = Router();

router.get('/public', getPublicMenuItems);

router.use(authenticate);
router.get('/', requirePermission('restaurant', 'view'), getMenuItems);
router.get('/deleted', authorize('admin', 'manager'), requirePermission('restaurant', 'view'), getDeletedMenuItems);
router.post('/', authorize('admin', 'manager'), requirePermission('restaurant', 'edit'), createMenuItem);
router.post('/upload-image', authorize('admin', 'manager'), requirePermission('restaurant', 'edit'), uploadImages.single('image'), uploadMenuItemImage);
router.put('/:id', authorize('admin', 'manager'), requirePermission('restaurant', 'edit'), updateMenuItem);
router.put('/:id/restore', authorize('admin', 'manager'), requirePermission('restaurant', 'edit'), restoreMenuItem);
router.delete('/:id', authorize('admin', 'manager'), requirePermission('restaurant', 'delete'), deleteMenuItem);

export default router;
