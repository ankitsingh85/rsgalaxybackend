import { Router } from 'express';
import {
  register, login, getMe,
  changePassword, forgotPassword, verifyOTP, resetPassword
} from '../controller/auth.controller';
import { updateMyProfile, uploadMyAvatar, uploadMyIdDocument, deleteMyData } from '../controller/profile.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadImages } from '../middleware/upload.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Public routes — brute-force-sensitive, so these carry their own tight rate limit
// independent of general API traffic.
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// Password reset (public — no auth required)
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/verify-otp', authLimiter, verifyOTP);
router.post('/reset-password', authLimiter, resetPassword);

// Protected routes (require login)
router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateMyProfile);
router.put('/change-password', authenticate, changePassword);
router.post('/upload-avatar', authenticate, uploadImages.single('avatar'), uploadMyAvatar);
router.post('/upload-id', authenticate, uploadImages.single('idDocument'), uploadMyIdDocument);
router.delete('/data', authenticate, deleteMyData);

export default router;