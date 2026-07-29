import { Router } from 'express';
import {
  getHotels, getDeletedHotels, getHotel, createHotel, updateHotel,
  bulkUpdateStatus, deleteHotel, restoreHotel, hardDeleteHotel, uploadHotelImages, uploadHotelVideos, resolveMapLink,
} from '../controller/hotel.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadImages, uploadVideos } from '../middleware/upload.middleware';

const router = Router();

router.get('/', getHotels);
router.get('/deleted', authenticate, authorize('admin'), getDeletedHotels);
router.get('/:id', getHotel);
router.post('/', authenticate, authorize('admin'), createHotel);
router.post('/upload-images', authenticate, authorize('admin'), uploadImages.array('images', 8), uploadHotelImages);
router.post('/upload-videos', authenticate, authorize('admin'), uploadVideos.array('videos', 4), uploadHotelVideos);
router.post('/resolve-location', authenticate, authorize('admin'), resolveMapLink);
router.put('/bulk-status', authenticate, authorize('admin'), bulkUpdateStatus);
router.put('/:id', authenticate, authorize('admin', 'manager'), updateHotel);
router.put('/:id/restore', authenticate, authorize('admin'), restoreHotel);
router.delete('/:id', authenticate, authorize('admin'), deleteHotel);
router.delete('/:id/permanent', authenticate, authorize('admin'), hardDeleteHotel);

export default router;
