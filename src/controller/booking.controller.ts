import { Response, NextFunction } from 'express';
import Booking from '../models/Booking.model';
import Room from '../models/Room.model';
import User from '../models/User.model';
import { generateBookingRef } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth.middleware';

// GET /api/bookings
export const getBookings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query: any = {};
    if (req.user!.role === 'user') {
      query.userId = req.user!.id;
    } else if (req.user!.role === 'manager') {
      const user = await User.findById(req.user!.id);
      if (user?.managedHotelId) query.hotelId = user.managedHotelId;
    }
    const bookings = await Booking.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) { next(err); }
};

// POST /api/bookings
export const createBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roomId, checkIn, checkOut, guests, specialRequests, userId, status, paymentStatus } = req.body;
    const room = await Room.findById(roomId);
    if (!room) { res.status(404).json({ success: false, message: 'Room not found' }); return; }
    if (room.status !== 'available') {
      res.status(400).json({ success: false, message: 'Room is not available' });
      return;
    }

    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const nights = Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
    if (nights < 1) { res.status(400).json({ success: false, message: 'Invalid dates' }); return; }

    const subtotal = nights * room.price;
    const tax = Math.round(subtotal * 0.12);
    const totalPrice = subtotal + tax;

    const bookingUserId = ['admin', 'manager'].includes(req.user!.role) && userId ? userId : req.user!.id;
    const user = await User.findById(bookingUserId);
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    const booking = await Booking.create({
      bookingRef: generateBookingRef(),
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      hotelId: room.hotelId,
      hotelName: room.hotelName,
      roomId: room.id,
      roomNumber: room.roomNumber,
      roomType: room.type,
      checkIn: inDate,
      checkOut: outDate,
      guests,
      totalPrice,
      status: ['admin', 'manager'].includes(req.user!.role) && status ? status : 'confirmed',
      paymentStatus: ['admin', 'manager'].includes(req.user!.role) && paymentStatus ? paymentStatus : 'paid',
      specialRequests,
    });

    res.status(201).json({ success: true, message: 'Booking confirmed', booking });
  } catch (err) { next(err); }
};

// PUT /api/bookings/:id
export const updateBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const current = await Booking.findById(req.params.id);
    if (!current) { res.status(404).json({ success: false, message: 'Booking not found' }); return; }

    const data: any = { ...req.body };

    if (data.roomId) {
      const room = await Room.findById(data.roomId);
      if (!room) { res.status(404).json({ success: false, message: 'Room not found' }); return; }
      data.hotelId = room.hotelId;
      data.hotelName = room.hotelName;
      data.roomId = room.id;
      data.roomNumber = room.roomNumber;
      data.roomType = room.type;
    }

    if (data.userId && ['admin', 'manager'].includes(req.user!.role)) {
      const user = await User.findById(data.userId);
      if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
      data.userId = user.id;
      data.userName = user.name;
      data.userEmail = user.email;
    } else {
      delete data.userId;
    }

    const checkIn = data.checkIn ? new Date(data.checkIn) : current.checkIn;
    const checkOut = data.checkOut ? new Date(data.checkOut) : current.checkOut;
    const roomForPrice = data.roomId ? await Room.findById(data.roomId) : await Room.findById(current.roomId);
    if (roomForPrice && (data.roomId || data.checkIn || data.checkOut || data.guests)) {
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      if (nights < 1) { res.status(400).json({ success: false, message: 'Invalid dates' }); return; }
      const subtotal = nights * roomForPrice.price;
      data.totalPrice = subtotal + Math.round(subtotal * 0.12);
    }

    const booking = await Booking.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!booking) { res.status(404).json({ success: false, message: 'Booking not found' }); return; }
    res.json({ success: true, message: 'Booking updated', booking });
  } catch (err) { next(err); }
};

// DELETE /api/bookings/:id
export const deleteBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) { res.status(404).json({ success: false, message: 'Booking not found' }); return; }
    res.json({ success: true, message: 'Booking deleted' });
  } catch (err) { next(err); }
};
