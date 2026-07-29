import { Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import HomeContent from '../models/HomeContent.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { uploadSubdir } from '../config/uploadPaths';

const UPLOAD_DIR = uploadSubdir('home');

// Singleton document — the site only ever has one home page configuration.
const getOrCreateContent = async () => {
  let content = await HomeContent.findOne();
  if (!content) content = await HomeContent.create({});
  return content;
};

const STRING_FIELDS = [
  'heroImage', 'heroTagline', 'heroHeadline', 'heroHeadlineHighlight',
  'aboutEyebrow', 'aboutHeadline', 'aboutHeadlineHighlight', 'aboutDescription',
  'aboutImageMain', 'aboutImageTopRight', 'aboutImageBottomRight',
  'aboutBadgeValue', 'aboutBadgeLabel', 'aboutCtaText', 'aboutCtaLink',
  'amenitiesEyebrow', 'amenitiesHeadline',
];

const normalizePayload = (body: any) => {
  const payload: any = {};
  STRING_FIELDS.forEach(key => {
    if (body[key] !== undefined) payload[key] = body[key];
  });
  if (Array.isArray(body.heroStats)) {
    payload.heroStats = body.heroStats
      .filter((stat: any) => stat && (stat.value || stat.label))
      .map((stat: any) => ({ value: String(stat.value || ''), label: String(stat.label || '') }))
      .slice(0, 6);
  }
  if (Array.isArray(body.aboutFeatures)) {
    payload.aboutFeatures = body.aboutFeatures
      .filter((feature: any) => feature && feature.icon && feature.title)
      .map((feature: any) => ({
        icon: String(feature.icon),
        title: String(feature.title),
        subtitle: String(feature.subtitle || ''),
      }))
      .slice(0, 6);
  }
  if (Array.isArray(body.amenities)) {
    payload.amenities = body.amenities
      .filter((item: any) => item && item.icon && item.label)
      .map((item: any) => ({ icon: String(item.icon), label: String(item.label) }))
      .slice(0, 12);
  }
  if (Array.isArray(body.offerBanners)) {
    payload.offerBanners = body.offerBanners
      .filter((banner: any) => banner && banner.image)
      .map((banner: any) => ({
        image: String(banner.image),
        title: String(banner.title || ''),
        subtitle: String(banner.subtitle || ''),
        link: String(banner.link || ''),
      }))
      .slice(0, 20);
  }
  return payload;
};

export const getHomeContent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const home = await getOrCreateContent();
    res.json({ success: true, home });
  } catch (err) { next(err); }
};

export const getAdminHomeContent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const home = await getOrCreateContent();
    res.json({ success: true, home });
  } catch (err) { next(err); }
};

export const updateHomeContent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = normalizePayload(req.body);
    const home = await HomeContent.findOneAndUpdate(
      {},
      { $set: { ...payload, updatedBy: req.user?.id } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );
    await logAudit({ action: 'update', entityType: 'HomeContent', entityId: home!.id, entityName: 'Home Page Content', req });
    res.json({ success: true, message: 'Home content updated', home });
  } catch (err) { next(err); }
};

export const uploadHeroImage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ success: false, message: 'No hero image provided' });
      return;
    }

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const filename = `${crypto.randomUUID()}.jpg`;
    await sharp(file.buffer)
      .resize({ width: 1920, height: 1080, fit: 'cover' })
      .jpeg({ quality: 85 })
      .toFile(path.join(UPLOAD_DIR, filename));

    res.json({ success: true, url: `${req.protocol}://${req.get('host')}/uploads/home/${filename}` });
  } catch (err) { next(err); }
};

export const uploadAboutImage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ success: false, message: 'No image provided' });
      return;
    }

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const filename = `${crypto.randomUUID()}.jpg`;
    await sharp(file.buffer)
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(path.join(UPLOAD_DIR, filename));

    res.json({ success: true, url: `${req.protocol}://${req.get('host')}/uploads/home/${filename}` });
  } catch (err) { next(err); }
};

export const uploadOfferImage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ success: false, message: 'No image provided' });
      return;
    }

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const filename = `${crypto.randomUUID()}.jpg`;
    await sharp(file.buffer)
      .resize({ width: 1600, height: 900, fit: 'cover' })
      .jpeg({ quality: 85 })
      .toFile(path.join(UPLOAD_DIR, filename));

    res.json({ success: true, url: `${req.protocol}://${req.get('host')}/uploads/home/${filename}` });
  } catch (err) { next(err); }
};
