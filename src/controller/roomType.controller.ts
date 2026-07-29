import { Response, NextFunction } from 'express';
import RoomType from '../models/RoomType.model';
import { AuthRequest } from '../middleware/auth.middleware';

const DEFAULT_TYPES = ['Standard', 'Deluxe', 'Suite', 'Presidential'];

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/room-types — public; bootstraps sensible defaults on first run
export const getRoomTypes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const count = await RoomType.countDocuments();
    if (count === 0) {
      await RoomType.insertMany(DEFAULT_TYPES.map(name => ({ name, isActive: true })));
    }
    const query: any = {};
    if (req.query.active === 'true') query.isActive = true;
    const roomTypes = await RoomType.find(query).sort({ name: 1 });
    res.json({ success: true, count: roomTypes.length, roomTypes });
  } catch (err) { next(err); }
};

// POST /api/room-types — admin only
export const createRoomType = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, bedType, size } = req.body;
    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Room type name is required' });
      return;
    }
    const existing = await RoomType.findOne({ name: new RegExp(`^${escapeRegex(name.trim())}$`, 'i') });
    if (existing) {
      res.status(400).json({ success: false, message: 'A room type with this name already exists' });
      return;
    }
    const roomType = await RoomType.create({
      name: name.trim(),
      bedType: bedType?.trim() || undefined,
      size: size !== undefined && size !== '' ? Number(size) : undefined,
      isActive: true,
    });
    res.status(201).json({ success: true, message: 'Room type created', roomType });
  } catch (err) { next(err); }
};

// PUT /api/room-types/:id — admin only
export const updateRoomType = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, bedType, size, isActive } = req.body;
    const updates: any = {};
    if (name !== undefined) {
      if (!name.trim()) { res.status(400).json({ success: false, message: 'Room type name cannot be empty' }); return; }
      const existing = await RoomType.findOne({ name: new RegExp(`^${escapeRegex(name.trim())}$`, 'i'), _id: { $ne: req.params.id } });
      if (existing) { res.status(400).json({ success: false, message: 'A room type with this name already exists' }); return; }
      updates.name = name.trim();
    }
    if (bedType !== undefined) updates.bedType = bedType?.trim() || undefined;
    if (size !== undefined) updates.size = size !== '' ? Number(size) : undefined;
    if (isActive !== undefined) updates.isActive = isActive;

    const roomType = await RoomType.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!roomType) { res.status(404).json({ success: false, message: 'Room type not found' }); return; }
    res.json({ success: true, message: 'Room type updated', roomType });
  } catch (err) { next(err); }
};

// DELETE /api/room-types/:id — admin only; deactivates rather than hard-deletes so existing rooms keep their label
export const deleteRoomType = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roomType = await RoomType.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!roomType) { res.status(404).json({ success: false, message: 'Room type not found' }); return; }
    res.json({ success: true, message: 'Room type deactivated', roomType });
  } catch (err) { next(err); }
};
