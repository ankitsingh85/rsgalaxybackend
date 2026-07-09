import { Router } from 'express';
import {
  getRooms, getDeletedRooms, getRoomAvailability, getRoom, createRoom,
  uploadRoomImages, bulkUpdatePrice, updateRoom, restoreRoom, deleteRoom,
  getPublicRoomAvailability,
} from '../controller/room.controller';
import { authenticate, authorize, requirePermission } from '../middleware/auth.middleware';
import { uploadImages } from '../middleware/upload.middleware';

const router = Router();

router.get('/', getRooms);
router.get('/deleted', authenticate, authorize('admin', 'manager'), requirePermission('rooms', 'view'), getDeletedRooms);
router.get('/availability', authenticate, authorize('admin', 'manager'), requirePermission('rooms', 'view'), getRoomAvailability);
router.get('/:id', getRoom);
router.get('/:id/availability', getPublicRoomAvailability);
router.post('/', authenticate, authorize('admin', 'manager'), requirePermission('rooms', 'edit'), createRoom);
router.post('/upload-images', authenticate, authorize('admin', 'manager'), requirePermission('rooms', 'edit'), uploadImages.array('images', 8), uploadRoomImages);
router.put('/bulk-price', authenticate, authorize('admin', 'manager'), requirePermission('rooms', 'edit'), bulkUpdatePrice);
router.put('/:id', authenticate, authorize('admin', 'manager'), requirePermission('rooms', 'edit'), updateRoom);
router.put('/:id/restore', authenticate, authorize('admin', 'manager'), requirePermission('rooms', 'edit'), restoreRoom);
router.delete('/:id', authenticate, authorize('admin', 'manager'), requirePermission('rooms', 'delete'), deleteRoom);

export default router;
