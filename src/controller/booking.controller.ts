import { Response, NextFunction } from 'express';
import Booking from '../models/Booking.model';
import Room from '../models/Room.model';
import User from '../models/User.model';
import Service from '../models/Service.model';
import AmenityUsage from '../models/AmenityUsage.model';
import { generateBookingRef } from '../utils/jwt';
import { calculateStayPrice } from '../utils/pricing';
import { generateInvoicePdf } from '../utils/invoice';
import { resolveCoupon } from '../utils/coupon';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendBookingCheckInEmail, sendBookingCheckOutEmail, sendBookingCancelledEmail } from '../utils/email';

const RESCHEDULE_CUTOFF_MS = 24 * 60 * 60 * 1000;
const CANCEL_CUTOFF_MS = 48 * 60 * 60 * 1000;

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
    const {
      roomId, checkIn, checkOut, guests, specialRequests, userId, status, paymentStatus,
      extraServices, couponCode,
    } = req.body;
    const room = await Room.findById(roomId);
    if (!room) { res.status(404).json({ success: false, message: 'Room not found' }); return; }
    if (room.isDeleted || room.status !== 'available') {
      res.status(400).json({ success: false, message: 'Room is not available' });
      return;
    }

    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const { nights, totalPrice: stayTotal } = calculateStayPrice(room, inDate, outDate);
    if (nights < 1) { res.status(400).json({ success: false, message: 'Invalid dates' }); return; }

    const overlap = await Booking.findOne({
      roomId: room.id,
      status: { $nin: ['cancelled'] },
      checkIn: { $lt: outDate },
      checkOut: { $gt: inDate },
    });
    if (overlap) { res.status(400).json({ success: false, message: 'Room is not available for the selected dates' }); return; }

    const bookingUserId = ['admin', 'manager'].includes(req.user!.role) && userId ? userId : req.user!.id;
    const user = await User.findById(bookingUserId);
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    let resolvedServices: any[] = [];
    let servicesTotal = 0;
    if (Array.isArray(extraServices) && extraServices.length > 0) {
      for (const line of extraServices) {
        const service = await Service.findById(line.serviceId);
        if (!service || !service.isActive || service.hotelId.toString() !== room.hotelId.toString()) {
          res.status(400).json({ success: false, message: `"${service?.name || 'Service'}" is not available for this hotel` });
          return;
        }
        const quantity = Number(line.quantity || 1);
        resolvedServices.push({ serviceId: service.id, name: service.name, price: service.price, addedAt: new Date() });
        servicesTotal += service.price * quantity;
      }
    }

    let discountAmount = 0;
    let appliedCouponCode: string | undefined;
    const preDiscountTotal = stayTotal + servicesTotal;
    if (couponCode) {
      const result = await resolveCoupon(couponCode, preDiscountTotal);
      if (!result.valid) { res.status(400).json({ success: false, message: result.message }); return; }
      discountAmount = result.discountAmount;
      appliedCouponCode = result.coupon!.code;
    }

    const totalPrice = Math.max(0, preDiscountTotal - discountAmount);

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
      extraServices: resolvedServices,
      couponCode: appliedCouponCode,
      discountAmount,
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
    if (roomForPrice && (data.roomId || data.checkIn || data.checkOut || data.guests || data.extraServices)) {
      const { nights, totalPrice } = calculateStayPrice(roomForPrice, checkIn, checkOut);
      if (nights < 1) { res.status(400).json({ success: false, message: 'Invalid dates' }); return; }
      const servicesTotal = (data.extraServices || current.extraServices || [])
        .reduce((sum: number, s: any) => sum + Number(s.price || 0), 0);
      data.totalPrice = totalPrice + servicesTotal;
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

// PUT /api/bookings/:id/check-in
export const checkInBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'checked-in', checkInActualAt: new Date() },
      { new: true }
    );
    if (!booking) { res.status(404).json({ success: false, message: 'Booking not found' }); return; }
    res.json({ success: true, message: 'Guest checked in', booking });
    sendBookingCheckInEmail(booking.userEmail, booking.userName, booking).catch(() => {});
  } catch (err) { next(err); }
};

// PUT /api/bookings/:id/check-out
export const checkOutBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'checked-out', checkOutActualAt: new Date() },
      { new: true }
    );
    if (!booking) { res.status(404).json({ success: false, message: 'Booking not found' }); return; }
    res.json({ success: true, message: 'Guest checked out', booking });
    sendBookingCheckOutEmail(booking.userEmail, booking.userName, booking).catch(() => {});
  } catch (err) { next(err); }
};

// PUT /api/bookings/:id/cancel
export const cancelBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { reason } = req.body;
    if (!reason || !String(reason).trim()) {
      res.status(400).json({ success: false, message: 'Cancellation reason is required' });
      return;
    }

    const existing = await Booking.findById(req.params.id);
    if (!existing) { res.status(404).json({ success: false, message: 'Booking not found' }); return; }
    if (req.user!.role === 'user') {
      if (existing.userId.toString() !== req.user!.id) {
        res.status(403).json({ success: false, message: 'You can only cancel your own bookings' });
        return;
      }
      if (existing.checkIn.getTime() - Date.now() < CANCEL_CUTOFF_MS) {
        res.status(400).json({ success: false, message: 'Cancellations must be made at least 48 hours before check-in — please contact the hotel directly.' });
        return;
      }
    }

    const update: any = { status: 'cancelled', cancellationReason: reason.trim(), cancelledAt: new Date() };
    if (existing.paymentStatus === 'paid') update.paymentStatus = 'refunded';

    const booking = await Booking.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!booking) { res.status(404).json({ success: false, message: 'Booking not found' }); return; }
    res.json({ success: true, message: 'Booking cancelled', booking });
    sendBookingCancelledEmail(booking.userEmail, booking.userName, booking, booking.cancellationReason || '').catch(() => {});
  } catch (err) { next(err); }
};

// PUT /api/bookings/:id/reschedule — guest self-service date change / room upgrade
export const rescheduleMyBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roomId, checkIn, checkOut } = req.body;
    if (!checkIn || !checkOut) { res.status(400).json({ success: false, message: 'Check-in and check-out dates are required' }); return; }

    const booking = await Booking.findById(req.params.id);
    if (!booking) { res.status(404).json({ success: false, message: 'Booking not found' }); return; }
    if (req.user!.role === 'user' && booking.userId.toString() !== req.user!.id) {
      res.status(403).json({ success: false, message: 'You can only modify your own bookings' });
      return;
    }
    if (!['pending', 'confirmed'].includes(booking.status)) {
      res.status(400).json({ success: false, message: 'This booking can no longer be modified' });
      return;
    }
    if (booking.checkIn.getTime() - Date.now() < RESCHEDULE_CUTOFF_MS) {
      res.status(400).json({ success: false, message: 'Changes must be made at least 24 hours before check-in' });
      return;
    }

    const currentRoom = await Room.findById(booking.roomId);
    if (!currentRoom) { res.status(404).json({ success: false, message: 'Current room not found' }); return; }

    const targetRoom = roomId && roomId !== String(booking.roomId) ? await Room.findById(roomId) : currentRoom;
    if (!targetRoom) { res.status(404).json({ success: false, message: 'Room not found' }); return; }
    if (targetRoom.id !== currentRoom.id && targetRoom.price < currentRoom.price) {
      res.status(400).json({ success: false, message: 'Room changes must be an upgrade (equal or higher rate)' });
      return;
    }

    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);

    const overlap = await Booking.findOne({
      roomId: targetRoom.id,
      _id: { $ne: booking._id },
      status: { $nin: ['cancelled'] },
      checkIn: { $lt: outDate },
      checkOut: { $gt: inDate },
    });
    if (overlap) { res.status(400).json({ success: false, message: 'Room is not available for the selected dates' }); return; }

    const { nights, totalPrice } = calculateStayPrice(targetRoom, inDate, outDate);
    if (nights < 1) { res.status(400).json({ success: false, message: 'Invalid dates' }); return; }
    const servicesTotal = (booking.extraServices || []).reduce((sum: number, s: any) => sum + Number(s.price || 0), 0);

    booking.roomId = targetRoom.id as any;
    booking.roomNumber = targetRoom.roomNumber;
    booking.roomType = targetRoom.type;
    booking.hotelId = targetRoom.hotelId;
    booking.hotelName = targetRoom.hotelName;
    booking.checkIn = inDate;
    booking.checkOut = outDate;
    booking.totalPrice = totalPrice + servicesTotal;
    await booking.save();

    res.json({ success: true, message: 'Booking updated', booking });
  } catch (err) { next(err); }
};

// GET /api/bookings/:id/invoice
export const downloadInvoice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) { res.status(404).json({ success: false, message: 'Booking not found' }); return; }
    if (req.user!.role === 'user' && booking.userId.toString() !== req.user!.id) {
      res.status(403).json({ success: false, message: 'You can only download your own invoices' });
      return;
    }

    const [usage, room] = await Promise.all([
      AmenityUsage.find({ bookingId: booking._id }),
      Room.findById(booking.roomId),
    ]);
    const stay = room ? calculateStayPrice(room, booking.checkIn, booking.checkOut) : null;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${booking.bookingRef}.pdf"`);
    generateInvoicePdf(booking, usage, stay).pipe(res);
  } catch (err) { next(err); }
};
