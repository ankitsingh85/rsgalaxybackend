import Coupon from '../models/Coupon.model';
import Booking from '../models/Booking.model';

export interface CouponResult {
  valid: boolean;
  message?: string;
  discountAmount: number;
  coupon?: InstanceType<typeof Coupon>;
}

// Validates a coupon code against a booking amount and current usage — shared by
// the standalone "preview" endpoint and booking creation (which re-checks it for real).
export const resolveCoupon = async (code: string, bookingAmount: number): Promise<CouponResult> => {
  const coupon = await Coupon.findOne({ code: String(code).trim().toUpperCase() });
  if (!coupon || !coupon.isActive) return { valid: false, message: 'Invalid or inactive coupon code', discountAmount: 0 };

  const now = new Date();
  if (now < coupon.validFrom || now > coupon.validUntil) {
    return { valid: false, message: 'This coupon is not currently valid', discountAmount: 0 };
  }
  if (bookingAmount < coupon.minBookingAmount) {
    return { valid: false, message: `Minimum booking amount of Rs. ${coupon.minBookingAmount} required`, discountAmount: 0 };
  }

  const usedCount = await Booking.countDocuments({ couponCode: coupon.code, status: { $ne: 'cancelled' } });
  if (usedCount >= coupon.usageLimit) {
    return { valid: false, message: 'This coupon has reached its usage limit', discountAmount: 0 };
  }

  const discountAmount = coupon.type === 'percent'
    ? Math.round(bookingAmount * coupon.value / 100)
    : Math.min(coupon.value, bookingAmount);

  return { valid: true, discountAmount, coupon };
};
