import { Response, NextFunction } from 'express';
import AmenityUsage from '../models/AmenityUsage.model';
import Booking from '../models/Booking.model';
import Service from '../models/Service.model';
import User from '../models/User.model';
import { AuthRequest } from '../middleware/auth.middleware';

const computeAmount = (unitPrice: number, quantity: number, discountType?: string, discountValue?: number): number => {
  const subtotal = unitPrice * quantity;
  const discount = discountType === 'percent'
    ? Math.round(subtotal * (Number(discountValue) || 0) / 100)
    : Number(discountValue) || 0;
  return Math.max(0, subtotal - discount);
};

// GET /api/amenity-usage
export const getUsage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query: any = {};
    if (req.query.bookingId) {
      query.bookingId = req.query.bookingId;
    } else if (req.user!.role === 'manager') {
      const user = await User.findById(req.user!.id);
      if (user?.managedHotelId) query.hotelId = user.managedHotelId;
    } else if (req.query.hotelId) {
      query.hotelId = req.query.hotelId;
    }
    const usage = await AmenityUsage.find(query).sort({ usedAt: -1 });
    res.json({ success: true, count: usage.length, usage });
  } catch (err) { next(err); }
};

// POST /api/amenity-usage
export const createUsage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bookingId, serviceId, quantity, discountType, discountValue, notes } = req.body;
    if (!bookingId || !serviceId) {
      res.status(400).json({ success: false, message: 'Booking and amenity are required' });
      return;
    }
    const [booking, service] = await Promise.all([
      Booking.findById(bookingId),
      Service.findById(serviceId),
    ]);
    if (!booking) { res.status(404).json({ success: false, message: 'Booking not found' }); return; }
    if (!service) { res.status(404).json({ success: false, message: 'Amenity not found' }); return; }

    const qty = Number(quantity || 1);
    const amount = computeAmount(service.price, qty, discountType, discountValue);

    const usage = await AmenityUsage.create({
      bookingId: booking.id,
      hotelId: booking.hotelId,
      hotelName: booking.hotelName,
      serviceId: service.id,
      serviceName: service.name,
      unitPrice: service.price,
      quantity: qty,
      discountType,
      discountValue: Number(discountValue || 0),
      amount,
      notes,
    });

    res.status(201).json({ success: true, message: 'Usage logged', usage });
  } catch (err) { next(err); }
};

// PUT /api/amenity-usage/:id
export const updateUsage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const current = await AmenityUsage.findById(req.params.id);
    if (!current) { res.status(404).json({ success: false, message: 'Usage entry not found' }); return; }

    const { quantity, discountType, discountValue, notes } = req.body;
    const qty = quantity !== undefined ? Number(quantity) : current.quantity;
    const dType = discountType !== undefined ? discountType : current.discountType;
    const dValue = discountValue !== undefined ? Number(discountValue) : current.discountValue;
    const amount = computeAmount(current.unitPrice, qty, dType, dValue);

    const usage = await AmenityUsage.findByIdAndUpdate(
      req.params.id,
      { quantity: qty, discountType: dType, discountValue: dValue, amount, ...(notes !== undefined ? { notes } : {}) },
      { new: true, runValidators: true }
    );
    res.json({ success: true, message: 'Usage entry updated', usage });
  } catch (err) { next(err); }
};

// DELETE /api/amenity-usage/:id
export const deleteUsage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usage = await AmenityUsage.findByIdAndDelete(req.params.id);
    if (!usage) { res.status(404).json({ success: false, message: 'Usage entry not found' }); return; }
    res.json({ success: true, message: 'Usage entry removed' });
  } catch (err) { next(err); }
};
