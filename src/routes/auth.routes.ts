import { Router } from 'express';
import {
  register, login, getMe,
  changePassword, forgotPassword, verifyOTP, resetPassword
} from '../controller/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Password reset (public — no auth required)
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

// Protected routes (require login)
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);

export default router;