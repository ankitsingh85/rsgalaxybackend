import { Request, Response, NextFunction } from 'express';
import Room from '../models/Room.model';
import Hotel from '../models/Hotel.model';

// GET /api/rooms
export const getRooms = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { hotelId, type, status, maxPrice } = req.query;
    const query: any = {};
    if (hotelId) query.hotelId = hotelId;
    if (type) query.type = type;
    if (status) query.status = status;
    if (maxPrice) query.price = { $lte: Number(maxPrice) };

    const rooms = await Room.find(query).sort({ price: 1 });
    res.json({ success: true, count: rooms.length, rooms });
  } catch (err) { next(err); }
};

// GET /api/rooms/:id
export const getRoom = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) { res.status(404).json({ success: false, message: 'Room not found' }); return; }
    res.json({ success: true, room });
  } catch (err) { next(err); }
};

// POST /api/rooms — admin/manager
export const createRoom = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hotel = await Hotel.findById(req.body.hotelId);
    if (!hotel) { res.status(404).json({ success: false, message: 'Hotel not found' }); return; }

    const room = await Room.create({ ...req.body, hotelName: hotel.name });

    // Update hotel total rooms
    const count = await Room.countDocuments({ hotelId: hotel.id });
    hotel.totalRooms = count;
    await hotel.save();

    res.status(201).json({ success: true, message: 'Room created', room });
  } catch (err) { next(err); }
};

// PUT /api/rooms/:id
export const updateRoom = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!room) { res.status(404).json({ success: false, message: 'Room not found' }); return; }
    res.json({ success: true, message: 'Room updated', room });
  } catch (err) { next(err); }
};

// DELETE /api/rooms/:id
export const deleteRoom = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) { res.status(404).json({ success: false, message: 'Room not found' }); return; }

    const count = await Room.countDocuments({ hotelId: room.hotelId });
    await Hotel.findByIdAndUpdate(room.hotelId, { totalRooms: count });

    res.json({ success: true, message: 'Room deleted' });
  } catch (err) { next(err); }
};
