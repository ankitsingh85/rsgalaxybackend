import { Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import Service from '../models/Service.model';
import Hotel from '../models/Hotel.model';
import User from '../models/User.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { uploadSubdir } from '../config/uploadPaths';
import { getPublicBaseUrl } from '../utils/url';

const UPLOAD_DIR = uploadSubdir('services');

// GET /api/services/public?hotelId= — public; active add-ons for a hotel
export const getPublicServices = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query: any = { isActive: true };
    if (req.query.hotelId) query.hotelId = req.query.hotelId;
    const services = await Service.find(query).sort({ name: 1 });
    res.json({ success: true, count: services.length, services });
  } catch (err) { next(err); }
};

// GET /api/services
export const getServices = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query: any = {};
    if (req.user!.role === 'manager') {
      const user = await User.findById(req.user!.id);
      if (user?.managedHotelId) query.hotelId = user.managedHotelId;
    } else if (req.query.hotelId) {
      query.hotelId = req.query.hotelId;
    }
    const services = await Service.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: services.length, services });
  } catch (err) { next(err); }
};

// POST /api/services
export const createService = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { hotelId, name, price, description, image } = req.body;
    if (!hotelId || !name || price === undefined) {
      res.status(400).json({ success: false, message: 'Hotel, name, and price are required' });
      return;
    }
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) { res.status(404).json({ success: false, message: 'Hotel not found' }); return; }

    const service = await Service.create({
      hotelId: hotel.id,
      hotelName: hotel.name,
      name,
      price: Number(price),
      description,
      image,
      isActive: true,
    });

    res.status(201).json({ success: true, message: 'Service created', service });
  } catch (err) { next(err); }
};

// POST /api/services/upload-image
export const uploadServiceImage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) { res.status(400).json({ success: false, message: 'No image provided' }); return; }

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const filename = `${crypto.randomUUID()}.jpg`;
    await sharp(file.buffer)
      .resize({ width: 1200, height: 900, fit: 'cover' })
      .jpeg({ quality: 82 })
      .toFile(path.join(UPLOAD_DIR, filename));

    res.json({ success: true, url: `${getPublicBaseUrl(req)}/uploads/services/${filename}` });
  } catch (err) { next(err); }
};

// PUT /api/services/:id
export const updateService = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updates: any = { ...req.body };
    if (updates.price !== undefined) updates.price = Number(updates.price);
    delete updates.hotelId;
    delete updates.hotelName;

    const service = await Service.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!service) { res.status(404).json({ success: false, message: 'Service not found' }); return; }
    res.json({ success: true, message: 'Service updated', service });
  } catch (err) { next(err); }
};

// DELETE /api/services/:id — deactivate; historical usage/bookings keep their snapshot
export const deleteService = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!service) { res.status(404).json({ success: false, message: 'Service not found' }); return; }
    res.json({ success: true, message: 'Amenity deactivated', service });
  } catch (err) { next(err); }
};
