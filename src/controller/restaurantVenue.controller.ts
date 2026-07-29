import { Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import RestaurantVenue from '../models/RestaurantVenue.model';
import Hotel from '../models/Hotel.model';
import User from '../models/User.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { uploadSubdir } from '../config/uploadPaths';

const UPLOAD_DIR = uploadSubdir('restaurant-venues');

// GET /api/restaurant-venues/public?hotelId= — public; active dining venues for a hotel
export const getPublicVenues = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query: any = { isActive: true };
    if (req.query.hotelId) query.hotelId = req.query.hotelId;
    const venues = await RestaurantVenue.find(query).sort({ name: 1 });
    res.json({ success: true, count: venues.length, venues });
  } catch (err) { next(err); }
};

// GET /api/restaurant-venues
export const getVenues = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query: any = {};
    if (req.user!.role === 'manager') {
      const user = await User.findById(req.user!.id);
      if (user?.managedHotelId) query.hotelId = user.managedHotelId;
    } else if (req.query.hotelId) {
      query.hotelId = req.query.hotelId;
    }
    const venues = await RestaurantVenue.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: venues.length, venues });
  } catch (err) { next(err); }
};

// POST /api/restaurant-venues
export const createVenue = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { hotelId, name, tags, bannerImage, images, menuPdf, mealPeriods, address, email, phone } = req.body;
    if (!hotelId || !name) {
      res.status(400).json({ success: false, message: 'Hotel and name are required' });
      return;
    }
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) { res.status(404).json({ success: false, message: 'Hotel not found' }); return; }

    const venue = await RestaurantVenue.create({
      hotelId: hotel.id,
      hotelName: hotel.name,
      name,
      tags: tags || [],
      bannerImage,
      images: images || [],
      menuPdf,
      mealPeriods: mealPeriods || [],
      address,
      email,
      phone,
      isActive: true,
    });

    res.status(201).json({ success: true, message: 'Dining venue created', venue });
  } catch (err) { next(err); }
};

// POST /api/restaurant-venues/upload-images
export const uploadVenueImages = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) { res.status(400).json({ success: false, message: 'No images provided' }); return; }

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const urls = await Promise.all(files.map(async file => {
      const filename = `${crypto.randomUUID()}.jpg`;
      await sharp(file.buffer)
        .resize({ width: 1600, withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toFile(path.join(UPLOAD_DIR, filename));
      return `${req.protocol}://${req.get('host')}/uploads/restaurant-venues/${filename}`;
    }));

    res.json({ success: true, urls });
  } catch (err) { next(err); }
};

// POST /api/restaurant-venues/upload-menu-pdf
export const uploadVenueMenuPdf = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ success: false, message: 'No PDF provided' }); return; }

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const filename = `${crypto.randomUUID()}.pdf`;
    await fs.promises.writeFile(path.join(UPLOAD_DIR, filename), file.buffer);

    res.json({ success: true, url: `${req.protocol}://${req.get('host')}/uploads/restaurant-venues/${filename}` });
  } catch (err) { next(err); }
};

// PUT /api/restaurant-venues/:id
export const updateVenue = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updates: any = { ...req.body };
    delete updates.hotelId;
    delete updates.hotelName;

    const venue = await RestaurantVenue.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!venue) { res.status(404).json({ success: false, message: 'Dining venue not found' }); return; }
    res.json({ success: true, message: 'Dining venue updated', venue });
  } catch (err) { next(err); }
};

// DELETE /api/restaurant-venues/:id — deactivate
export const deleteVenue = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const venue = await RestaurantVenue.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!venue) { res.status(404).json({ success: false, message: 'Dining venue not found' }); return; }
    res.json({ success: true, message: 'Dining venue deactivated' });
  } catch (err) { next(err); }
};
