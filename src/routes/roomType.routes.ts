import { Router } from 'express';
import { getRoomTypes, createRoomType, updateRoomType, deleteRoomType } from '../controller/roomType.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getRoomTypes);
router.post('/', authenticate, authorize('admin'), createRoomType);
router.put('/:id', authenticate, authorize('admin'), updateRoomType);
router.delete('/:id', authenticate, authorize('admin'), deleteRoomType);

export default router;
