import Service from '../models/Service.model';
import { calculateStayPrice } from './pricing';
import { resolveCoupon } from './coupon';

export interface ResolvedMealPlan {
  name: string;
  price: number;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

export interface ResolvedService {
  serviceId: any;
  name: string;
  price: number;
  addedAt: Date;
}

export interface ResolvedPricing {
  nights: number;
  totalPrice: number;
  selectedMealPlans: ResolvedMealPlan[];
  resolvedServices: ResolvedService[];
  discountAmount: number;
  appliedCouponCode?: string;
  mattressAdded: boolean;
  mattressCostPerNight: number;
}

// Shared by both the Razorpay order-creation endpoint and booking creation so the
// amount a guest is charged always matches the amount the booking is recorded with —
// never trust a client-supplied price for either step.
export const resolveBookingPricing = async (
  room: any,
  checkIn: Date,
  checkOut: Date,
  mealPackageIndices: unknown,
  extraServices: unknown,
  couponCode: unknown,
  adults: unknown,
  userId?: string
): Promise<{ error: string } | ResolvedPricing> => {
  const selectedMealPlans: ResolvedMealPlan[] = [];
  if (Array.isArray(mealPackageIndices) && mealPackageIndices.length > 0) {
    for (const idx of mealPackageIndices) {
      const pkg = room.mealPackages[Number(idx)];
      if (!pkg) return { error: 'Selected meal package is not available for this room' };
      selectedMealPlans.push({ name: pkg.name, price: pkg.price, breakfast: pkg.breakfast, lunch: pkg.lunch, dinner: pkg.dinner });
    }
  }
  const adultCount = Math.max(1, Number(adults || 1));
  // Meal plans are priced per adult — kids (up to 8 yrs) don't add to the meal or
  // mattress cost, only additional adults do.
  const mealAddonPerNight = selectedMealPlans.reduce((sum, p) => sum + p.price, 0) * adultCount;

  // A mattress automatically accommodates any adults beyond the room's base adult
  // capacity — priced per extra adult per night, whenever the room offers it. Not an
  // opt-in: if the adult count needs it, it's included. Kids don't count toward this.
  const extraGuests = Math.max(0, adultCount - room.capacityAdults);
  const mattressAdded = room.hasMattressOption && extraGuests > 0;
  const mattressCostPerNight = mattressAdded ? room.mattressPrice * extraGuests : 0;

  const { nights, totalPrice: stayTotal } = calculateStayPrice(room, checkIn, checkOut, mealAddonPerNight + mattressCostPerNight);
  if (nights < 1) return { error: 'Invalid dates' };

  const resolvedServices: ResolvedService[] = [];
  let servicesTotal = 0;
  if (Array.isArray(extraServices) && extraServices.length > 0) {
    for (const line of extraServices as any[]) {
      const service = await Service.findById(line.serviceId);
      if (!service || !service.isActive || service.hotelId.toString() !== room.hotelId.toString()) {
        return { error: `"${service?.name || 'Service'}" is not available for this hotel` };
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
    const result = await resolveCoupon(couponCode as string, preDiscountTotal, userId);
    if (!result.valid) return { error: result.message! };
    discountAmount = result.discountAmount;
    appliedCouponCode = result.coupon!.code;
  }

  const totalPrice = Math.max(0, preDiscountTotal - discountAmount);
  return { nights, totalPrice, selectedMealPlans, resolvedServices, discountAmount, appliedCouponCode, mattressAdded, mattressCostPerNight };
};
