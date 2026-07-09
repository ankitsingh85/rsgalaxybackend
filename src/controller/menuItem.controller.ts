import { Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import MenuItem from '../models/MenuItem.model';
import Hotel from '../models/Hotel.model';
import User from '../models/User.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { uploadSubdir } from '../config/uploadPaths';

const UPLOAD_DIR = uploadSubdir('menu-items');

// GET /api/menu-items/public — no auth; only available, non-archived items
export const getPublicMenuItems = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query: any = { isDeleted: { $ne: true }, isAvailable: true };
    if (req.query.hotelId) query.hotelId = req.query.hotelId;
    const menuItems = await MenuItem.find(query).sort({ category: 1, name: 1 });
    res.json({ success: true, count: menuItems.length, menuItems });
  } catch (err) { next(err); }
};

// GET /api/menu-items
export const getMenuItems = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query: any = { isDeleted: { $ne: true } };
    if (req.user!.role === 'manager') {
      const user = await User.findById(req.user!.id);
      if (user?.managedHotelId) query.hotelId = user.managedHotelId;
    } else if (req.query.hotelId) {
      query.hotelId = req.query.hotelId;
    }
    const menuItems = await MenuItem.find(query).sort({ category: 1, name: 1 });
    res.json({ success: true, count: menuItems.length, menuItems });
  } catch (err) { next(err); }
};

// GET /api/menu-items/deleted
export const getDeletedMenuItems = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query: any = { isDeleted: true };
    if (req.user!.role === 'manager') {
      const user = await User.findById(req.user!.id);
      if (user?.managedHotelId) query.hotelId = user.managedHotelId;
    } else if (req.query.hotelId) {
      query.hotelId = req.query.hotelId;
    }
    const menuItems = await MenuItem.find(query).sort({ deletedAt: -1 });
    res.json({ success: true, count: menuItems.length, menuItems });
  } catch (err) { next(err); }
};

// POST /api/menu-items
export const createMenuItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { hotelId, name, category, price, image, dietaryTags } = req.body;
    if (!hotelId || !name || !category || price === undefined) {
      res.status(400).json({ success: false, message: 'Hotel, name, category, and price are required' });
      return;
    }
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) { res.status(404).json({ success: false, message: 'Hotel not found' }); return; }

    const menuItem = await MenuItem.create({
      hotelId: hotel.id,
      hotelName: hotel.name,
      name,
      category,
      price: Number(price),
      image,
      dietaryTags: dietaryTags || [],
      isAvailable: true,
    });

    res.status(201).json({ success: true, message: 'Menu item created', menuItem });
  } catch (err) { next(err); }
};

// POST /api/menu-items/upload-image
export const uploadMenuItemImage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ success: false, message: 'No image provided' }); return; }

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const filename = `${crypto.randomUUID()}.jpg`;
    await sharp(file.buffer)
      .resize({ width: 1200, height: 900, fit: 'cover' })
      .jpeg({ quality: 82 })
      .toFile(path.join(UPLOAD_DIR, filename));

    res.json({ success: true, url: `${req.protocol}://${req.get('host')}/uploads/menu-items/${filename}` });
  } catch (err) { next(err); }
};

// PUT /api/menu-items/:id
export const updateMenuItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updates: any = { ...req.body };
    if (updates.price !== undefined) updates.price = Number(updates.price);
    delete updates.hotelId;
    delete updates.hotelName;

    const menuItem = await MenuItem.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!menuItem) { res.status(404).json({ success: false, message: 'Menu item not found' }); return; }
    res.json({ success: true, message: 'Menu item updated', menuItem });
  } catch (err) { next(err); }
};

// PUT /api/menu-items/:id/restore
export const restoreMenuItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { isDeleted: false, $unset: { deletedAt: 1 } },
      { new: true }
    );
    if (!menuItem) { res.status(404).json({ success: false, message: 'Menu item not found' }); return; }
    res.json({ success: true, message: 'Menu item restored', menuItem });
  } catch (err) { next(err); }
};

// DELETE /api/menu-items/:id — archive; historical orders keep their item snapshot
export const deleteMenuItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!menuItem) { res.status(404).json({ success: false, message: 'Menu item not found' }); return; }
    res.json({ success: true, message: 'Menu item archived' });
  } catch (err) { next(err); }
};
