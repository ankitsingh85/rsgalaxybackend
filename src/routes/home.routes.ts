import { Router } from 'express';
import {
  getAdminHomeContent, getHomeContent, updateHomeContent, uploadAboutImage, uploadHeroImage, uploadOfferImage,
} from '../controller/home.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadImages, uploadOfferImage as uploadOfferImageMiddleware } from '../middleware/upload.middleware';

const router = Router();

router.get('/', getHomeContent);
router.get('/admin', authenticate, authorize('admin'), getAdminHomeContent);
router.put('/admin', authenticate, authorize('admin'), updateHomeContent);
router.post('/admin/upload-hero-image', authenticate, authorize('admin'), uploadImages.single('heroImage'), uploadHeroImage);
router.post('/admin/upload-about-image', authenticate, authorize('admin'), uploadImages.single('image'), uploadAboutImage);
router.post('/admin/upload-offer-image', authenticate, authorize('admin'), uploadOfferImageMiddleware.single('image'), uploadOfferImage);

export default router;
