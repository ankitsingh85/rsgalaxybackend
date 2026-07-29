interface CustomRate {
  startDate: Date | string;
  endDate: Date | string;
  price: number;
}

interface RoomRate {
  price: number;
  weekendRate?: number;
  customRates?: CustomRate[];
}

export interface StayPrice {
  nights: number;
  subtotal: number;
  tax: number;
  totalPrice: number;
}

const dateKey = (d: Date): string => d.toISOString().slice(0, 10);

// Priority for any given night: a custom date-range override > the weekend rate > the base price.
const rateForNight = (room: RoomRate, d: Date): number => {
  const key = dateKey(d);
  const custom = room.customRates?.find(r => key >= dateKey(new Date(r.startDate)) && key <= dateKey(new Date(r.endDate)));
  if (custom) return custom.price;

  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
  return isWeekend && room.weekendRate ? room.weekendRate : room.price;
};

// Sat/Sun nights bill at weekendRate (falls back to price if unset); a custom date range
// takes priority over both when the night falls inside one. addonPerNight (the sum of any
// selected meal-package add-ons) is added on top of that nightly rate, not a replacement.
export const calculateStayPrice = (room: RoomRate, checkIn: Date, checkOut: Date, addonPerNight = 0): StayPrice => {
  let nights = 0;
  let subtotal = 0;
  for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
    subtotal += rateForNight(room, d) + addonPerNight;
    nights++;
  }
  const tax = Math.round(subtotal * 0.12);
  return { nights, subtotal, tax, totalPrice: subtotal + tax };
};
