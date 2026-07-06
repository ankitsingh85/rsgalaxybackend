import { Request, Response, NextFunction } from 'express';
import User from '../models/User.model';
import Hotel from '../models/Hotel.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { sendAccountBannedEmail, sendPasswordChangedEmail } from '../utils/email';

// ──────────────────────────────────────────
// GET /api/users  (admin only — get all users)
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
// GET /api/users/deleted  (admin only)
// ──────────────────────────────────────────
export const getDeletedUsers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await User.find({ isDeleted: true }).sort({ deletedAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────
// POST /api/users/customer  (admin creates customer)
// ──────────────────────────────────────────
export const createCustomer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;

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

    const user = await User.create({ name, email, password, phone, role: 'user' });
    await logAudit({ action: 'create', entityType: 'User', entityId: user.id, entityName: user.name, req });

    res.status(201).json({ success: true, message: 'Customer created', user });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────
// POST /api/users/manager  (admin creates manager)
// ──────────────────────────────────────────
export const createManager = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, phone, managedHotelId } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required' });
      return;
    }

    const existing = await User.findOne({ email });
    if (existing) { res.status(400).json({ success: false, message: 'Email already exists' }); return; }

    const user = await User.create({
      name, email, password, phone, managedHotelId,
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
// PUT /api/users/:id  (update user)
// ──────────────────────────────────────────
export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updates: any = { ...req.body };
    delete updates.password;
    delete updates.role;
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
// PUT /api/users/:id/toggle-status  (activate/deactivate)
// ──────────────────────────────────────────
export const toggleUserStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user!.id === req.params.id) {
      res.status(400).json({ success: false, message: 'You cannot deactivate yourself' });
      return;
    }

    const user = await User.findById(req.params.id);
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

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
// PUT /api/users/:id/reset-password  (admin only)
// ──────────────────────────────────────────
export const resetUserPassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
      return;
    }

    const user = await User.findById(req.params.id);
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    user.password = newPassword;
    await user.save();

    sendPasswordChangedEmail(user.email, user.name).catch(console.error);
    await logAudit({ action: 'password-reset', entityType: 'User', entityId: user.id, entityName: user.name, req });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) { next(err); }
};

// ──────────────────────────────────────────
// PUT /api/users/:id/ban  (admin only)
// ──────────────────────────────────────────
export const banUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { reason } = req.body;
    if (!reason) { res.status(400).json({ success: false, message: 'A ban reason is required' }); return; }
    if (req.user!.id === req.params.id) { res.status(400).json({ success: false, message: 'You cannot ban yourself' }); return; }

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
// PUT /api/users/:id/unban  (admin only)
// ──────────────────────────────────────────
export const unbanUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
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
// PUT /api/users/:id/soft-delete  (admin only)
// ──────────────────────────────────────────
export const softDeleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user!.id === req.params.id) { res.status(400).json({ success: false, message: 'You cannot delete your own account' }); return; }

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
// PUT /api/users/:id/restore  (admin only)
// ──────────────────────────────────────────
export const restoreUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
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