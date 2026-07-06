import { Router } from 'express';
import { getRooms, getRoom, createRoom, updateRoom, deleteRoom } from '../controller/room.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getRooms);
router.get('/:id', getRoom);
router.post('/', authenticate, authorize('admin', 'manager'), createRoom);
router.put('/:id', authenticate, authorize('admin', 'manager'), updateRoom);
router.delete('/:id', authenticate, authorize('admin', 'manager'), deleteRoom);

export default router;
