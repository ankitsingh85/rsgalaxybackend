import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import bcrypt from 'bcryptjs';
import User from '../models/User.model';
import Hotel from '../models/Hotel.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { sendAccountBannedEmail, sendPasswordChangedEmail } from '../utils/email';
import { uploadSubdir } from '../config/uploadPaths';
import { getPublicBaseUrl } from '../utils/url';

const UPLOAD_DIR = uploadSubdir('guests');

// A manager (now that Customers routes are open to them, gated by permission) may only ever
// act on customer accounts (role 'user') — never on admin/manager accounts, regardless of
// what's checked in their permission matrix. Returns: undefined = not found, null = forbidden
// target for a manager caller, otherwise the fetched user document.
const assertManagerCanTarget = async (req: AuthRequest, targetId: string | string[]) => {
  const target = await User.findById(String(targetId));
  if (!target) return undefined;
  if (req.user!.role === 'manager' && target.role !== 'user') return null;
  return target;
};

// ──────────────────────────────────────────
// GET /api/users  (admin/manager — get all users)
// ──────────────────────────────────────────
export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role } = req.query;
    const query: any = { isDeleted: { $ne: true } };
    if (role) query.role = role;
    const users = await User.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────
// GET /api/users/deleted  (admin/manager)
// ──────────────────────────────────────────
export const getDeletedUsers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await User.find({ isDeleted: true }).sort({ deletedAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────
// POST /api/users/customer  (admin/manager creates customer)
// ──────────────────────────────────────────
export const createCustomer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, phone, preferences, notes, idDocument, loyaltyTier, isVIP } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }

    const existing = await User.findOne({ email });
    if (existing) { res.status(400).json({ success: false, message: 'An account with this email already exists' }); return; }

    const user = await User.create({
      name, email, password, phone, role: 'user',
      preferences, notes, idDocument,
      loyaltyTier: loyaltyTier || 'none',
      isVIP: !!isVIP,
    });
    await logAudit({ action: 'create', entityType: 'User', entityId: user.id, entityName: user.name, req });

    res.status(201).json({ success: true, message: 'Customer created', user });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────
// POST /api/users/upload-id  (admin/manager — guest ID document photo)
// ──────────────────────────────────────────
export const uploadGuestId = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ success: false, message: 'No image provided' }); return; }

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const filename = `${crypto.randomUUID()}.jpg`;
    await sharp(file.buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(path.join(UPLOAD_DIR, filename));

    res.json({ success: true, url: `${getPublicBaseUrl(req)}/uploads/guests/${filename}` });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────
// POST /api/users/manager  (admin creates manager)
// ──────────────────────────────────────────
export const createManager = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, phone, managedHotelId, permissions } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required' });
      return;
    }

    const existing = await User.findOne({ email });
    if (existing) { res.status(400).json({ success: false, message: 'Email already exists' }); return; }

    const user = await User.create({
      name, email, password, phone, managedHotelId, permissions,
      role: 'manager',
    });

    if (managedHotelId) {
      await Hotel.findByIdAndUpdate(managedHotelId, { managerId: user.id, managerName: user.name });
    }
    res.status(201).json({ success: true, message: 'Manager created', user });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────
// POST /api/users/admin  (admin creates another admin)
// ──────────────────────────────────────────
export const createAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;

    // Validation
    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }

    // Check duplicate
    const existing = await User.findOne({ email });
    if (existing) {
      res.status(400).json({ success: false, message: 'An account with this email already exists' });
      return;
    }

    // Create new admin
    const admin = await User.create({
      name,
      email,
      password,
      phone,
      role: 'admin',
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      user: {
        _id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        phone: admin.phone,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
      },
    });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────
// GET /api/users/admins  (get all admins)
// ──────────────────────────────────────────
export const getAdmins = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admins = await User.find({ role: 'admin' }).sort({ createdAt: -1 });
    res.json({ success: true, count: admins.length, admins });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────
// PUT /api/users/:id  (update user — admin/manager, manager restricted to customer targets)
// ──────────────────────────────────────────
export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const target = await assertManagerCanTarget(req, req.params.id);
    if (target === undefined) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    if (target === null) { res.status(403).json({ success: false, message: 'Managers can only manage customer accounts' }); return; }

    const updates: any = { ...req.body };
    delete updates.password;
    delete updates.role;
    // `permissions` is allowed through here — this is how an admin edits an existing
    // manager's access matrix. Safe because a manager caller can never reach a manager/admin
    // target via this route at all (assertManagerCanTarget only allows 'user' targets for them).
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, message: 'User updated', user });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────
// DELETE /api/users/:id  (admin only)
// ──────────────────────────────────────────
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Prevent admin from deleting themselves
    if (req.user!.id === req.params.id) {
      res.status(400).json({ success: false, message: 'You cannot delete your own account' });
      return;
    }

    const user = await User.findById(req.params.id);
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        res.status(400).json({ success: false, message: 'Cannot delete the last admin account' });
        return;
      }
    }

    await user.deleteOne();
    res.json({ success: true, message: 'User deleted' });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────
// PUT /api/users/:id/toggle-status  (activate/deactivate — admin/manager, customers only for manager)
// ──────────────────────────────────────────
export const toggleUserStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user!.id === req.params.id) {
      res.status(400).json({ success: false, message: 'You cannot deactivate yourself' });
      return;
    }

    const user = await assertManagerCanTarget(req, req.params.id);
    if (user === undefined) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    if (user === null) { res.status(403).json({ success: false, message: 'Managers can only manage customer accounts' }); return; }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'}`,
      user
    });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────
// PUT /api/users/:id/reset-password  (admin/manager, customers only for manager)
// ──────────────────────────────────────────
export const resetUserPassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
      return;
    }

    const user = await assertManagerCanTarget(req, req.params.id);
    if (user === undefined) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    if (user === null) { res.status(403).json({ success: false, message: 'Managers can only manage customer accounts' }); return; }

    user.password = newPassword;
    await user.save();

    sendPasswordChangedEmail(user.email, user.name).catch(console.error);
    await logAudit({ action: 'password-reset', entityType: 'User', entityId: user.id, entityName: user.name, req });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────
// PUT /api/users/:id/ban  (admin/manager, customers only for manager)
// ──────────────────────────────────────────
export const banUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { reason } = req.body;
    if (!reason) { res.status(400).json({ success: false, message: 'A ban reason is required' }); return; }
    if (req.user!.id === req.params.id) { res.status(400).json({ success: false, message: 'You cannot ban yourself' }); return; }

    const target = await assertManagerCanTarget(req, req.params.id);
    if (target === undefined) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    if (target === null) { res.status(403).json({ success: false, message: 'Managers can only manage customer accounts' }); return; }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: true, banReason: reason, bannedAt: new Date(), bannedBy: req.user?.id },
      { new: true }
    );
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    sendAccountBannedEmail(user.email, user.name, reason).catch(console.error);
    await logAudit({ action: 'ban', entityType: 'User', entityId: user.id, entityName: user.name, req, meta: { reason } });

    res.json({ success: true, message: 'User banned', user });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────
// PUT /api/users/:id/unban  (admin/manager, customers only for manager)
// ──────────────────────────────────────────
export const unbanUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const target = await assertManagerCanTarget(req, req.params.id);
    if (target === undefined) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    if (target === null) { res.status(403).json({ success: false, message: 'Managers can only manage customer accounts' }); return; }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: false, $unset: { banReason: 1, bannedAt: 1, bannedBy: 1 } },
      { new: true }
    );
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    await logAudit({ action: 'unban', entityType: 'User', entityId: user.id, entityName: user.name, req });

    res.json({ success: true, message: 'User unbanned', user });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────
// PUT /api/users/:id/soft-delete  (admin/manager, customers only for manager)
// ──────────────────────────────────────────
export const softDeleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user!.id === req.params.id) { res.status(400).json({ success: false, message: 'You cannot delete your own account' }); return; }

    const target = await assertManagerCanTarget(req, req.params.id);
    if (target === undefined) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    if (target === null) { res.status(403).json({ success: false, message: 'Managers can only manage customer accounts' }); return; }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date(), deletedBy: req.user?.id },
      { new: true }
    );
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    await logAudit({ action: 'soft-delete', entityType: 'User', entityId: user.id, entityName: user.name, req });

    res.json({ success: true, message: 'User moved to trash' });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────
// PUT /api/users/:id/anonymize  (admin/manager, customers only for manager — GDPR)
// ──────────────────────────────────────────
export const anonymizeUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user!.id === req.params.id) { res.status(400).json({ success: false, message: 'You cannot anonymize your own account' }); return; }

    const target = await assertManagerCanTarget(req, req.params.id);
    if (target === undefined) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    if (target === null) { res.status(403).json({ success: false, message: 'Managers can only manage customer accounts' }); return; }

    const randomPassword = await bcrypt.hash(crypto.randomUUID(), 12);
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        name: 'Deleted Guest',
        email: `deleted-${target.id}@anonymized.local`,
        password: randomPassword,
        isActive: false,
        isAnonymized: true,
        anonymizedAt: new Date(),
        $unset: { phone: 1, preferences: 1, notes: 1, idDocument: 1, avatar: 1 },
      },
      { new: true }
    );
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    await logAudit({ action: 'anonymize', entityType: 'User', entityId: user.id, entityName: target.name, req });

    res.json({ success: true, message: 'Guest anonymized', user });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────
// PUT /api/users/:id/restore  (admin/manager, customers only for manager)
// ──────────────────────────────────────────
export const restoreUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const target = await assertManagerCanTarget(req, req.params.id);
    if (target === undefined) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    if (target === null) { res.status(403).json({ success: false, message: 'Managers can only manage customer accounts' }); return; }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isDeleted: false, $unset: { deletedAt: 1, deletedBy: 1 } },
      { new: true }
    );
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    await logAudit({ action: 'restore', entityType: 'User', entityId: user.id, entityName: user.name, req });

    res.json({ success: true, message: 'User restored', user });
  } catch (err) { next(err); }
};
