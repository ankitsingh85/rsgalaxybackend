import { Router } from 'express';
import { getServices, getPublicServices, createService, uploadServiceImage, updateService, deleteService } from '../controller/service.controller';
import { authenticate, authorize, requirePermission } from '../middleware/auth.middleware';
import { uploadImages } from '../middleware/upload.middleware';

const router = Router();

router.get('/public', getPublicServices);

router.use(authenticate);
router.get('/', authorize('admin', 'manager'), requirePermission('amenities', 'view'), getServices);
router.post('/', authorize('admin', 'manager'), requirePermission('amenities', 'edit'), createService);
router.post('/upload-image', authorize('admin', 'manager'), requirePermission('amenities', 'edit'), uploadImages.single('image'), uploadServiceImage);
router.put('/:id', authorize('admin', 'manager'), requirePermission('amenities', 'edit'), updateService);
router.delete('/:id', authorize('admin', 'manager'), requirePermission('amenities', 'delete'), deleteService);

export default router;
