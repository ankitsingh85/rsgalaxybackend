import { Response, NextFunction } from 'express';
import Review from '../models/Review.model';
import Booking from '../models/Booking.model';
import { AuthRequest } from '../middleware/auth.middleware';

// GET /api/reviews/mine
export const getMyReviews = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reviews = await Review.find({ userId: req.user!.id }).sort({ createdAt: -1 });
    res.json({ success: true, count: reviews.length, reviews });
  } catch (err) { next(err); }
};

// GET /api/reviews/hotel/:hotelId — public
export const getHotelReviews = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reviews = await Review.find({ hotelId: req.params.hotelId }).sort({ createdAt: -1 }).limit(50);
    const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    res.json({ success: true, count: reviews.length, avgRating, reviews });
  } catch (err) { next(err); }
};

// POST /api/reviews
export const createReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bookingId, rating, comment } = req.body;
    if (!bookingId || !rating) {
      res.status(400).json({ success: false, message: 'Booking and rating are required' });
      return;
    }
    const ratingNum = Number(rating);
    if (ratingNum < 1 || ratingNum > 5) {
      res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
      return;
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) { res.status(404).json({ success: false, message: 'Booking not found' }); return; }
    if (booking.userId.toString() !== req.user!.id) {
      res.status(403).json({ success: false, message: 'You can only review your own bookings' });
      return;
    }
    if (booking.status !== 'checked-out') {
      res.status(400).json({ success: false, message: 'You can only review a completed stay' });
      return;
    }

    const existing = await Review.findOne({ bookingId });
    if (existing) { res.status(400).json({ success: false, message: 'You have already reviewed this stay' }); return; }

    const review = await Review.create({
      bookingId: booking.id,
      hotelId: booking.hotelId,
      hotelName: booking.hotelName,
      userId: req.user!.id,
      userName: booking.userName,
      rating: ratingNum,
      comment,
    });

    res.status(201).json({ success: true, message: 'Review posted', review });
  } catch (err) { next(err); }
};

// PUT /api/reviews/:id
export const updateReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { rating, comment } = req.body;
    const updates: any = {};
    if (rating !== undefined) {
      const ratingNum = Number(rating);
      if (ratingNum < 1 || ratingNum > 5) { res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' }); return; }
      updates.rating = ratingNum;
    }
    if (comment !== undefined) updates.comment = comment;

    const review = await Review.findOneAndUpdate({ _id: req.params.id, userId: req.user!.id }, updates, { new: true, runValidators: true });
    if (!review) { res.status(404).json({ success: false, message: 'Review not found' }); return; }
    res.json({ success: true, message: 'Review updated', review });
  } catch (err) { next(err); }
};

// DELETE /api/reviews/:id
export const deleteReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const review = await Review.findOneAndDelete({ _id: req.params.id, userId: req.user!.id });
    if (!review) { res.status(404).json({ success: false, message: 'Review not found' }); return; }
    res.json({ success: true, message: 'Review deleted' });
  } catch (err) { next(err); }
};
