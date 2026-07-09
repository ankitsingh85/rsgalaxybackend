import { Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import Hotel from '../models/Hotel.model';
import Room from '../models/Room.model';
import Booking from '../models/Booking.model';
import User from '../models/User.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { uploadSubdir } from '../config/uploadPaths';

const UPLOAD_DIR = uploadSubdir('hotels');

// GET /api/hotels
export const getHotels = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { city, status, search } = req.query;
    const query: any = { isDeleted: { $ne: true } };
    if (city) query.city = new RegExp(String(city), 'i');
    if (status) query.status = status;
    if (search) query.name = new RegExp(String(search), 'i');

    const hotels = await Hotel.find(query).sort({ rating: -1 });
    res.json({ success: true, count: hotels.length, hotels });
  } catch (err) { next(err); }
};

// GET /api/hotels/deleted — admin only
export const getDeletedHotels = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotels = await Hotel.find({ isDeleted: true }).sort({ deletedAt: -1 });
    res.json({ success: true, count: hotels.length, hotels });
  } catch (err) { next(err); }
};

// GET /api/hotels/:id
export const getHotel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) { res.status(404).json({ success: false, message: 'Hotel not found' }); return; }
    const rooms = await Room.find({ hotelId: hotel.id });
    res.json({ success: true, hotel, rooms });
  } catch (err) { next(err); }
};

// POST /api/hotels — admin only
export const createHotel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotel = await Hotel.create(req.body);
    await logAudit({ action: 'create', entityType: 'Hotel', entityId: hotel.id, entityName: hotel.name, req, meta: { snapshot: hotel.toObject() } });
    res.status(201).json({ success: true, message: 'Hotel created', hotel });
  } catch (err) { next(err); }
};

// PUT /api/hotels/:id — admin/manager
export const updateHotel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!hotel) { res.status(404).json({ success: false, message: 'Hotel not found' }); return; }
    await logAudit({ action: 'update', entityType: 'Hotel', entityId: hotel.id, entityName: hotel.name, req, meta: { changes: req.body } });
    res.json({ success: true, message: 'Hotel updated', hotel });
  } catch (err) { next(err); }
};

// PUT /api/hotels/bulk-status — admin only
export const bulkUpdateStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !['active', 'inactive', 'suspended'].includes(status)) {
      res.status(400).json({ success: false, message: 'ids array and a valid status are required' });
      return;
    }
    const result = await Hotel.updateMany({ _id: { $in: ids } }, { status });
    await logAudit({
      action: 'bulk-status-update', entityType: 'Hotel', entityId: ids[0], req,
      meta: { ids, status, matched: result.matchedCount, modified: result.modifiedCount },
    });
    res.json({ success: true, message: `${result.modifiedCount} hotel(s) updated`, modified: result.modifiedCount });
  } catch (err) { next(err); }
};

// DELETE /api/hotels/:id — admin only (soft delete)
export const deleteHotel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date(), deletedBy: req.user?.id },
      { new: true }
    );
    if (!hotel) { res.status(404).json({ success: false, message: 'Hotel not found' }); return; }
    await logAudit({ action: 'soft-delete', entityType: 'Hotel', entityId: hotel.id, entityName: hotel.name, req });
    res.json({ success: true, message: 'Hotel moved to trash' });
  } catch (err) { next(err); }
};

// PUT /api/hotels/:id/restore — admin only
export const restoreHotel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(
      req.params.id,
      { isDeleted: false, $unset: { deletedAt: 1, deletedBy: 1 } },
      { new: true }
    );
    if (!hotel) { res.status(404).json({ success: false, message: 'Hotel not found' }); return; }
    await logAudit({ action: 'restore', entityType: 'Hotel', entityId: hotel.id, entityName: hotel.name, req });
    res.json({ success: true, message: 'Hotel restored', hotel });
  } catch (err) { next(err); }
};

// DELETE /api/hotels/:id/permanent — admin only (hard delete + cascade)
export const hardDeleteHotel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) { res.status(404).json({ success: false, message: 'Hotel not found' }); return; }

    const [rooms, bookings, managers] = await Promise.all([
      Room.deleteMany({ hotelId: hotel.id }),
      Booking.deleteMany({ hotelId: hotel.id }),
      User.updateMany({ managedHotelId: hotel.id }, { $unset: { managedHotelId: 1 } }),
    ]);
    await Hotel.findByIdAndDelete(hotel.id);

    await logAudit({
      action: 'hard-delete', entityType: 'Hotel', entityId: hotel.id, entityName: hotel.name, req,
      meta: { roomsDeleted: rooms.deletedCount, bookingsDeleted: bookings.deletedCount, managersUnassigned: managers.modifiedCount },
    });
    res.json({ success: true, message: 'Hotel permanently deleted', cascaded: { rooms: rooms.deletedCount, bookings: bookings.deletedCount, managers: managers.modifiedCount } });
  } catch (err) { next(err); }
};

// POST /api/hotels/upload-images — admin only
export const uploadHotelImages = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      res.status(400).json({ success: false, message: 'No images provided' });
      return;
    }
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    const urls = await Promise.all(files.map(async file => {
      const filename = `${crypto.randomUUID()}.jpg`;
      await sharp(file.buffer)
        .resize({ width: 1600, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(path.join(UPLOAD_DIR, filename));
      return `${req.protocol}://${req.get('host')}/uploads/hotels/${filename}`;
    }));

    res.json({ success: true, urls });
  } catch (err) { next(err); }
};
