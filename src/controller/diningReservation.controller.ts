import { Response, NextFunction } from 'express';
import DiningReservation from '../models/DiningReservation.model';
import RestaurantVenue from '../models/RestaurantVenue.model';
import Hotel from '../models/Hotel.model';
import User from '../models/User.model';
import { AuthRequest } from '../middleware/auth.middleware';

// POST /api/dining-reservations — public
export const submitReservation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { hotelId, venueId, name, email, phone, date, time, guests, message } = req.body;
    if (!hotelId || !venueId || !name || !email || !phone || !date || !time || !guests) {
      res.status(400).json({ success: false, message: 'Name, email, phone, date, time, and guests are required' });
      return;
    }
    const [hotel, venue] = await Promise.all([
      Hotel.findById(hotelId),
      RestaurantVenue.findById(venueId),
    ]);
    if (!hotel) { res.status(404).json({ success: false, message: 'Hotel not found' }); return; }
    if (!venue) { res.status(404).json({ success: false, message: 'Dining venue not found' }); return; }

    const reservation = await DiningReservation.create({
      hotelId: hotel.id,
      hotelName: hotel.name,
      venueId: venue.id,
      venueName: venue.name,
      name,
      email,
      phone,
      date,
      time,
      guests: Number(guests),
      message,
      status: 'pending',
    });

    res.status(201).json({ success: true, message: 'Reservation request received! The hotel will contact you shortly.', reservation });
  } catch (err) { next(err); }
};

// GET /api/dining-reservations
export const getReservations = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query: any = {};
    if (req.user!.role === 'manager') {
      const user = await User.findById(req.user!.id);
      if (user?.managedHotelId) query.hotelId = user.managedHotelId;
    } else if (req.query.hotelId) {
      query.hotelId = req.query.hotelId;
    }
    const reservations = await DiningReservation.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: reservations.length, reservations });
  } catch (err) { next(err); }
};

// PUT /api/dining-reservations/:id
export const updateReservation = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.body;
    const reservation = await DiningReservation.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!reservation) { res.status(404).json({ success: false, message: 'Reservation not found' }); return; }
    res.json({ success: true, message: 'Reservation updated', reservation });
  } catch (err) { next(err); }
};
