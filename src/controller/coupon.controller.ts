import { Response, NextFunction } from 'express';
import Coupon from '../models/Coupon.model';
import Booking from '../models/Booking.model';
import { resolveCoupon } from '../utils/coupon';
import { AuthRequest } from '../middleware/auth.middleware';

const normalizeCode = (code: string) => code.trim().toUpperCase();

// POST /api/coupons/validate — any logged-in guest, preview a discount before booking
export const validateCoupon = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, bookingAmount } = req.body;
    if (!code || bookingAmount === undefined) {
      res.status(400).json({ success: false, message: 'Coupon code and booking amount are required' });
      return;
    }
    const result = await resolveCoupon(code, Number(bookingAmount), req.user!.id);
    if (!result.valid) { res.status(400).json({ success: false, message: result.message }); return; }
    res.json({ success: true, discountAmount: result.discountAmount });
  } catch (err) { next(err); }
};

// GET /api/coupons/public — no login required, but personalizes for a logged-in caller:
// returns currently-valid public coupons plus any 'targeted' coupons issued to them.
export const getPublicCoupons = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const now = new Date();
    const query: any = {
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      $or: req.user
        ? [{ visibility: 'public' }, { visibility: 'targeted', targetUserIds: req.user.id }]
        : [{ visibility: 'public' }],
    };
    const coupons = await Coupon.find(query)
      .select('code type value minBookingAmount validUntil visibility')
      .sort({ value: -1 });
    res.json({ success: true, count: coupons.length, coupons });
  } catch (err) { next(err); }
};

const couponAnalytics = (coupon: any, bookingStats: any) => {
  const usedCount = bookingStats?.usedCount || coupon.usedCount || 0;
  const revenueImpact = bookingStats?.revenueImpact || coupon.revenueImpact || 0;
  const totalBookingRevenue = bookingStats?.totalBookingRevenue || coupon.totalBookingRevenue || 0;
  const usageLimit = coupon.usageLimit || 1;

  return {
    usageCount: usedCount,
    usageLimit,
    redemptionRate: Math.round((usedCount / usageLimit) * 100),
    revenueImpact,
    totalBookingRevenue,
  };
};

const getBookingCouponStats = async () => {
  const stats = await Booking.aggregate([
    { $match: { couponCode: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: '$couponCode',
        usedCount: { $sum: 1 },
        revenueImpact: { $sum: { $ifNull: ['$discountAmount', 0] } },
        totalBookingRevenue: { $sum: { $ifNull: ['$totalPrice', 0] } },
      },
    },
  ]);

  return stats.reduce((acc: any, item: any) => {
    acc[item._id] = item;
    return acc;
  }, {});
};

export const getCoupons = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [coupons, bookingStats] = await Promise.all([
      Coupon.find().sort({ createdAt: -1 }),
      getBookingCouponStats(),
    ]);

    res.json({
      success: true,
      count: coupons.length,
      coupons: coupons.map((coupon: any) => ({
        ...coupon.toObject(),
        analytics: couponAnalytics(coupon, bookingStats[coupon.code]),
      })),
    });
  } catch (err) { next(err); }
};

export const createCoupon = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, type, value, validFrom, validUntil, minBookingAmount, usageLimit, visibility, targetUserIds } = req.body;
    if (!code || !type || value === undefined || !validFrom || !validUntil || !usageLimit) {
      res.status(400).json({ success: false, message: 'Code, type, value, validity, and usage limit are required' });
      return;
    }

    if (!['flat', 'percent'].includes(type)) {
      res.status(400).json({ success: false, message: 'Coupon type must be flat or percent' });
      return;
    }
    if (type === 'percent' && Number(value) > 100) {
      res.status(400).json({ success: false, message: 'Percent discount cannot exceed 100' });
      return;
    }
    if (new Date(validUntil) <= new Date(validFrom)) {
      res.status(400).json({ success: false, message: 'Valid until must be after valid from' });
      return;
    }
    if (visibility === 'targeted' && (!Array.isArray(targetUserIds) || targetUserIds.length === 0)) {
      res.status(400).json({ success: false, message: 'Select at least one user for a targeted coupon' });
      return;
    }

    const coupon = await Coupon.create({
      code: normalizeCode(code),
      type,
      value: Number(value),
      validFrom,
      validUntil,
      minBookingAmount: Number(minBookingAmount || 0),
      usageLimit: Number(usageLimit),
      visibility: visibility === 'targeted' ? 'targeted' : 'public',
      targetUserIds: visibility === 'targeted' ? targetUserIds : [],
      isActive: true,
    });

    res.status(201).json({ success: true, message: 'Coupon created', coupon });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(400).json({ success: false, message: 'Coupon code already exists' });
      return;
    }
    next(err);
  }
};

export const updateCoupon = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updates: any = { ...req.body };
    if (updates.code) updates.code = normalizeCode(updates.code);
    ['value', 'minBookingAmount', 'usageLimit'].forEach(key => {
      if (updates[key] !== undefined) updates[key] = Number(updates[key]);
    });
    if (updates.validFrom && updates.validUntil && new Date(updates.validUntil) <= new Date(updates.validFrom)) {
      res.status(400).json({ success: false, message: 'Valid until must be after valid from' });
      return;
    }
    if (updates.type === 'percent' && updates.value > 100) {
      res.status(400).json({ success: false, message: 'Percent discount cannot exceed 100' });
      return;
    }
    if (updates.visibility === 'targeted' && (!Array.isArray(updates.targetUserIds) || updates.targetUserIds.length === 0)) {
      res.status(400).json({ success: false, message: 'Select at least one user for a targeted coupon' });
      return;
    }
    if (updates.visibility === 'public') updates.targetUserIds = [];
    if (updates.isActive === false) updates.deactivatedAt = new Date();
    const shouldReactivate = updates.isActive === true;

    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      shouldReactivate ? { $set: updates, $unset: { deactivatedAt: 1 } } : { $set: updates },
      { new: true, runValidators: true }
    );
    if (!coupon) { res.status(404).json({ success: false, message: 'Coupon not found' }); return; }
    res.json({ success: true, message: 'Coupon updated', coupon });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(400).json({ success: false, message: 'Coupon code already exists' });
      return;
    }
    next(err);
  }
};

export const deactivateCoupon = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { isActive: false, deactivatedAt: new Date() },
      { new: true }
    );
    if (!coupon) { res.status(404).json({ success: false, message: 'Coupon not found' }); return; }
    res.json({ success: true, message: 'Coupon deactivated', coupon });
  } catch (err) { next(err); }
};
