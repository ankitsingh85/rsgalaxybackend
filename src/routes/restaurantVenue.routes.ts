import { Router } from 'express';
import {
  getVenues, getPublicVenues, createVenue, uploadVenueImages, uploadVenueMenuPdf, updateVenue, deleteVenue,
} from '../controller/restaurantVenue.controller';
import { authenticate, authorize, requirePermission } from '../middleware/auth.middleware';
import { uploadImages, uploadDocuments } from '../middleware/upload.middleware';

const router = Router();

router.get('/public', getPublicVenues);

router.use(authenticate);
router.get('/', authorize('admin', 'manager'), requirePermission('restaurant', 'view'), getVenues);
router.post('/', authorize('admin', 'manager'), requirePermission('restaurant', 'edit'), createVenue);
router.post('/upload-images', authorize('admin', 'manager'), requirePermission('restaurant', 'edit'), uploadImages.array('images', 8), uploadVenueImages);
router.post('/upload-menu-pdf', authorize('admin', 'manager'), requirePermission('restaurant', 'edit'), uploadDocuments.single('menuPdf'), uploadVenueMenuPdf);
router.put('/:id', authorize('admin', 'manager'), requirePermission('restaurant', 'edit'), updateVenue);
router.delete('/:id', authorize('admin', 'manager'), requirePermission('restaurant', 'delete'), deleteVenue);

export default router;
