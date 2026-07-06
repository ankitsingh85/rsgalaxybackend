import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.model';
import { generateToken } from '../utils/jwt';
import { generateOTP, sendOTPEmail, sendPasswordChangedEmail } from '../utils/email';
import { AuthRequest } from '../middleware/auth.middleware';

// ─────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required' });
      return;
    }

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(400).json({ success: false, message: 'Email already registered' });
      return;
    }

    const user = await User.create({ name, email, password, phone, role: 'user' });
    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user.id, name: user.name, email: user.email,
        role: user.role, phone: user.phone, createdAt: user.createdAt,
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401).json({ success: false, message: 'No account found with this email' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Incorrect password' });
      return;
    }

    if (user.isDeleted) {
      res.status(403).json({ success: false, message: 'Account not found.' });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({ success: false, message: `Account suspended${user.banReason ? `: ${user.banReason}` : ''}. Contact administrator.` });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ success: false, message: 'Account is deactivated. Contact administrator.' });
      return;
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        phone: user.phone, managedHotelId: user.managedHotelId, createdAt: user.createdAt,
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

// ═════════════════════════════════════════
// 🆕 PUT /api/auth/change-password  (logged in user)
// ═════════════════════════════════════════
export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Current and new password are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
      return;
    }

    if (currentPassword === newPassword) {
      res.status(400).json({ success: false, message: 'New password must be different from current password' });
      return;
    }

    const user = await User.findById(req.user!.id).select('+password');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Current password is incorrect' });
      return;
    }

    // Save new password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    // Send confirmation email (non-blocking)
    sendPasswordChangedEmail(user.email, user.name).catch(console.error);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (err) { next(err); }
};

// ═════════════════════════════════════════
// 🆕 POST /api/auth/forgot-password  (send OTP)
// ═════════════════════════════════════════
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists (security)
      res.json({ success: true, message: 'If an account exists with this email, an OTP has been sent.' });
      return;
    }

    // Generate 6-digit OTP
    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    // Save OTP with 10-minute expiry
    user.resetOTP = hashedOTP;
    user.resetOTPExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Send OTP email
    try {
      await sendOTPEmail(email, otp, user.name);
    } catch (emailError: any) {
      // Rollback OTP if email fails
      user.resetOTP = undefined;
      user.resetOTPExpiry = undefined;
      await user.save();

      res.status(500).json({
        success: false,
        message: 'Failed to send email. Please check your email configuration or try again later.'
      });
      return;
    }

    res.json({
      success: true,
      message: 'OTP sent to your email. It will expire in 10 minutes.',
      email: email,
    });
  } catch (err) { next(err); }
};

// ═════════════════════════════════════════
// 🆕 POST /api/auth/verify-otp  (verify OTP without resetting yet)
// ═════════════════════════════════════════
export const verifyOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Email and OTP are required' });
      return;
    }

    const user = await User.findOne({ email }).select('+resetOTP +resetOTPExpiry');
    if (!user || !user.resetOTP || !user.resetOTPExpiry) {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      return;
    }

    // Check expiry
    if (user.resetOTPExpiry < new Date()) {
      user.resetOTP = undefined;
      user.resetOTPExpiry = undefined;
      await user.save();
      res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
      return;
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, user.resetOTP);
    if (!isValid) {
      res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
      return;
    }

    res.json({
      success: true,
      message: 'OTP verified successfully. You can now reset your password.',
    });
  } catch (err) { next(err); }
};

// ═════════════════════════════════════════
// 🆕 POST /api/auth/reset-password  (with OTP + new password)
// ═════════════════════════════════════════
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }

    const user = await User.findOne({ email }).select('+password +resetOTP +resetOTPExpiry');
    if (!user || !user.resetOTP || !user.resetOTPExpiry) {
      res.status(400).json({ success: false, message: 'Invalid request. Please request a new OTP.' });
      return;
    }

    // Check OTP expiry
    if (user.resetOTPExpiry < new Date()) {
      user.resetOTP = undefined;
      user.resetOTPExpiry = undefined;
      await user.save();
      res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
      return;
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, user.resetOTP);
    if (!isValid) {
      res.status(400).json({ success: false, message: 'Invalid OTP.' });
      return;
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.resetOTP = undefined;
    user.resetOTPExpiry = undefined;
    await user.save();

    // Send confirmation email (non-blocking)
    sendPasswordChangedEmail(user.email, user.name).catch(console.error);

    // Generate new login token
    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    res.json({
      success: true,
      message: 'Password reset successfully! You are now logged in.',
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
      },
    });
  } catch (err) { next(err); }
};