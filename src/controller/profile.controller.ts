import { Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import User from '../models/User.model';
import SavedCard from '../models/SavedCard.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { uploadSubdir } from '../config/uploadPaths';
import { getPublicBaseUrl } from '../utils/url';

const AVATAR_DIR = uploadSubdir('avatars');
const ID_DIR = uploadSubdir('guests');

// PUT /api/auth/me — self-service profile update
export const updateMyProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, phone, dateOfBirth, avatar, preferences, notificationPrefs } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth;
    if (avatar !== undefined) updates.avatar = avatar;
    if (preferences !== undefined) updates.preferences = preferences;
    if (notificationPrefs !== undefined) {
      updates['notificationPrefs.email'] = !!notificationPrefs.email;
      updates['notificationPrefs.push'] = !!notificationPrefs.push;
    }

    const user = await User.findByIdAndUpdate(req.user!.id, updates, { new: true, runValidators: true });
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, message: 'Profile updated', user });
  } catch (err) { next(err); }
};

// POST /api/auth/upload-avatar
export const uploadMyAvatar = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ success: false, message: 'No image provided' }); return; }

    fs.mkdirSync(AVATAR_DIR, { recursive: true });
    const filename = `${crypto.randomUUID()}.jpg`;
    await sharp(file.buffer)
      .resize({ width: 500, height: 500, fit: 'cover' })
      .jpeg({ quality: 85 })
      .toFile(path.join(AVATAR_DIR, filename));

    res.json({ success: true, url: `${getPublicBaseUrl(req)}/uploads/avatars/${filename}` });
  } catch (err) { next(err); }
};

// POST /api/auth/upload-id
export const uploadMyIdDocument = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ success: false, message: 'No image provided' }); return; }

    fs.mkdirSync(ID_DIR, { recursive: true });
    const filename = `${crypto.randomUUID()}.jpg`;
    await sharp(file.buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(path.join(ID_DIR, filename));

    res.json({ success: true, url: `${getPublicBaseUrl(req)}/uploads/guests/${filename}` });
  } catch (err) { next(err); }
};

// DELETE /api/auth/data — partial data deletion (saved cards only; account/history untouched)
export const deleteMyData = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await SavedCard.deleteMany({ userId: req.user!.id });
    res.json({ success: true, message: 'Saved cards removed', removedCards: result.deletedCount });
  } catch (err) { next(err); }
};
