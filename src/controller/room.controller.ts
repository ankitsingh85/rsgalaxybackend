import { Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import Room from '../models/Room.model';
import Hotel from '../models/Hotel.model';
import Booking from '../models/Booking.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { uploadSubdir } from '../config/uploadPaths';
import { getPublicBaseUrl } from '../utils/url';

const UPLOAD_DIR = uploadSubdir('rooms');

// GET /api/rooms
export const getRooms = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { hotelId, type, status, minPrice, maxPrice, search, guests, city, minRating } = req.query;
    const query: any = { isDeleted: { $ne: true } };
    if (hotelId) query.hotelId = hotelId;
    if (type) query.type = type;
    if (status) query.status = status;
    if (guests) query.capacityAdults = { $gte: Number(guests) };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) {
      const re = new RegExp(String(search), 'i');
      query.$or = [{ type: re }, { bedType: re }, { hotelName: re }];
    }
    if (city || minRating) {
      const hotelQuery: any = { isDeleted: { $ne: true } };
      if (city && city !== 'All Cities') hotelQuery.city = new RegExp(String(city), 'i');
      if (minRating) hotelQuery.rating = { $gte: Number(minRating) };
      const hotels = await Hotel.find(hotelQuery).select('_id');
      query.hotelId = { $in: hotels.map(h => h._id) };
    }

    const rooms = await Room.find(query).sort({ price: 1 });
    res.json({ success: true, count: rooms.length, rooms });
  } catch (err) { next(err); }
};

// GET /api/rooms/deleted — admin only
export const getDeletedRooms = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rooms = await Room.find({ isDeleted: true }).sort({ deletedAt: -1 });
    res.json({ success: true, count: rooms.length, rooms });
  } catch (err) { next(err); }
};

// GET /api/rooms/availability — admin/manager
export const getRoomAvailability = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { hotelId, from, to } = req.query;
    if (!hotelId) { res.status(400).json({ success: false, message: 'hotelId is required' }); return; }

    const fromDate = from ? new Date(String(from)) : new Date();
    fromDate.setHours(0, 0, 0, 0);
    const toDate = to ? new Date(String(to)) : new Date(fromDate.getTime() + 13 * 86400000);
    toDate.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(toDate.getTime() + 86400000); // exclusive upper bound

    const [rooms, bookings] = await Promise.all([
      Room.find({ hotelId, isDeleted: { $ne: true } }).sort({ type: 1 }),
      Booking.find({
        hotelId,
        status: { $nin: ['cancelled'] },
        checkIn: { $lt: rangeEnd },
        checkOut: { $gt: fromDate },
      }),
    ]);

    const dateKeys: string[] = [];
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      dateKeys.push(d.toISOString().slice(0, 10));
    }

    const bookedByRoom = new Map<string, Set<string>>();
    for (const booking of bookings) {
      const roomKey = String(booking.roomId);
      const set = bookedByRoom.get(roomKey) || new Set<string>();
      const start = booking.checkIn > fromDate ? booking.checkIn : fromDate;
      const end = booking.checkOut < rangeEnd ? booking.checkOut : rangeEnd;
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        set.add(d.toISOString().slice(0, 10));
      }
      bookedByRoom.set(roomKey, set);
    }

    const roomRows = rooms.map(room => {
      const bookedDates = bookedByRoom.get(room.id) || new Set<string>();
      const days: Record<string, 'occupied' | 'maintenance' | 'available'> = {};
      for (const key of dateKeys) {
        days[key] = bookedDates.has(key) ? 'occupied' : room.status === 'maintenance' ? 'maintenance' : 'available';
      }
      return { roomId: room.id, type: room.type, bedType: room.bedType, status: room.status, days };
    });

    const occupancy: Record<string, { total: number; occupied: number; rate: number }> = {};
    for (const key of dateKeys) {
      const total = roomRows.length;
      const occupied = roomRows.filter(r => r.days[key] === 'occupied').length;
      occupancy[key] = { total, occupied, rate: total ? Math.round((occupied / total) * 100) : 0 };
    }

    res.json({
      success: true,
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
      dates: dateKeys,
      rooms: roomRows,
      occupancy,
    });
  } catch (err) { next(err); }
};

// GET /api/rooms/:id
export const getRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) { res.status(404).json({ success: false, message: 'Room not found' }); return; }
    res.json({ success: true, room });
  } catch (err) { next(err); }
};

// GET /api/rooms/:id/availability — public; booked date ranges for this room only
export const getPublicRoomAvailability = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const fromDate = new Date(new Date().toDateString());
    const toDate = new Date(fromDate.getTime() + 180 * 86400000);

    const bookings = await Booking.find({
      roomId: req.params.id,
      status: { $nin: ['cancelled'] },
      checkIn: { $lt: toDate },
      checkOut: { $gt: fromDate },
    }).select('checkIn checkOut');

    res.json({
      success: true,
      bookedRanges: bookings.map(b => ({ checkIn: b.checkIn, checkOut: b.checkOut })),
    });
  } catch (err) { next(err); }
};

// POST /api/rooms — admin/manager
export const createRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotel = await Hotel.findById(req.body.hotelId);
    if (!hotel) { res.status(404).json({ success: false, message: 'Hotel not found' }); return; }

    const room = await Room.create({ ...req.body, hotelName: hotel.name });

    const count = await Room.countDocuments({ hotelId: hotel.id, isDeleted: { $ne: true } });
    hotel.totalRooms = count;
    await hotel.save();

    await logAudit({ action: 'create', entityType: 'Room', entityId: room.id, entityName: `${room.hotelName} — ${room.type}`, req, meta: { snapshot: room.toObject() } });
    res.status(201).json({ success: true, message: 'Room created', room });
  } catch (err) { next(err); }
};

// POST /api/rooms/upload-images — admin/manager
export const uploadRoomImages = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
      return `${getPublicBaseUrl(req)}/uploads/rooms/${filename}`;
    }));

    res.json({ success: true, urls });
  } catch (err) { next(err); }
};

// PUT /api/rooms/bulk-price — admin/manager
export const bulkUpdatePrice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ids, mode, price, weekendRate, percent } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !['set', 'percent'].includes(mode)) {
      res.status(400).json({ success: false, message: 'ids array and a valid mode are required' });
      return;
    }

    let modified = 0;
    if (mode === 'set') {
      const update: any = {};
      if (price !== undefined) update.price = Number(price);
      if (weekendRate !== undefined) update.weekendRate = Number(weekendRate);
      if (Object.keys(update).length === 0) {
        res.status(400).json({ success: false, message: 'price or weekendRate is required' });
        return;
      }
      const result = await Room.updateMany({ _id: { $in: ids } }, update);
      modified = result.modifiedCount;
    } else {
      const factor = 1 + Number(percent) / 100;
      const rooms = await Room.find({ _id: { $in: ids } });
      const ops = rooms.map(room => ({
        updateOne: {
          filter: { _id: room._id },
          update: {
            price: Math.round(room.price * factor),
            ...(room.weekendRate ? { weekendRate: Math.round(room.weekendRate * factor) } : {}),
          },
        },
      }));
      if (ops.length > 0) {
        const result = await Room.bulkWrite(ops);
        modified = result.modifiedCount;
      }
    }

    await logAudit({ action: 'bulk-price-update', entityType: 'Room', entityId: ids[0], req, meta: { ids, mode, price, weekendRate, percent, modified } });
    res.json({ success: true, message: `${modified} room(s) updated`, modified });
  } catch (err) { next(err); }
};

// PUT /api/rooms/:id
export const updateRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updates: any = { ...req.body };
    // hotelName is denormalized for display/search — if a room is reassigned to a
    // different hotel, re-derive it from the authoritative Hotel record rather than
    // trusting whatever (possibly stale) name the client sent alongside hotelId.
    if (updates.hotelId) {
      const hotel = await Hotel.findById(updates.hotelId);
      if (!hotel) { res.status(404).json({ success: false, message: 'Hotel not found' }); return; }
      updates.hotelName = hotel.name;
    }

    const room = await Room.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!room) { res.status(404).json({ success: false, message: 'Room not found' }); return; }
    await logAudit({ action: 'update', entityType: 'Room', entityId: room.id, entityName: `${room.hotelName} — ${room.type}`, req, meta: { changes: req.body } });
    res.json({ success: true, message: 'Room updated', room });
  } catch (err) { next(err); }
};

// PUT /api/rooms/:id/restore — admin/manager
export const restoreRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { isDeleted: false, $unset: { deletedAt: 1, deletedBy: 1 } },
      { new: true }
    );
    if (!room) { res.status(404).json({ success: false, message: 'Room not found' }); return; }

    const count = await Room.countDocuments({ hotelId: room.hotelId, isDeleted: { $ne: true } });
    await Hotel.findByIdAndUpdate(room.hotelId, { totalRooms: count });

    await logAudit({ action: 'restore', entityType: 'Room', entityId: room.id, entityName: `${room.hotelName} — ${room.type}`, req });
    res.json({ success: true, message: 'Room reactivated', room });
  } catch (err) { next(err); }
};

// DELETE /api/rooms/:id — admin/manager (deactivate; preserves historical bookings)
export const deleteRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date(), deletedBy: req.user?.id },
      { new: true }
    );
    if (!room) { res.status(404).json({ success: false, message: 'Room not found' }); return; }

    const count = await Room.countDocuments({ hotelId: room.hotelId, isDeleted: { $ne: true } });
    await Hotel.findByIdAndUpdate(room.hotelId, { totalRooms: count });

    await logAudit({ action: 'soft-delete', entityType: 'Room', entityId: room.id, entityName: `${room.hotelName} — ${room.type}`, req });
    res.json({ success: true, message: 'Room deactivated' });
  } catch (err) { next(err); }
};
