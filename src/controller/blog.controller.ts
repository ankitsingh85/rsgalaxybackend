import { Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import Blog from '../models/Blog.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { uploadSubdir } from '../config/uploadPaths';

const UPLOAD_DIR = uploadSubdir('blogs');

const listFromInput = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).map(v => v.trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(Boolean);
  return [];
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const adminQuery = (query: any) => {
  const filter: any = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = new RegExp(String(query.category), 'i');
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = new Date(String(query.dateFrom));
    if (query.dateTo) filter.createdAt.$lte = new Date(String(query.dateTo));
  }
  if (query.search) {
    filter.$or = [
      { title: new RegExp(String(query.search), 'i') },
      { excerpt: new RegExp(String(query.search), 'i') },
      { category: new RegExp(String(query.search), 'i') },
      { tags: new RegExp(String(query.search), 'i') },
    ];
  }
  return filter;
};

const normalizePayload = (body: any, isCreate = false) => {
  const payload: any = {};
  ['title', 'excerpt', 'content', 'coverImage', 'category', 'status', 'seoTitle', 'seoDescription'].forEach(key => {
    if (body[key] !== undefined) payload[key] = body[key];
  });
  if (body.slug !== undefined || body.title) payload.slug = body.slug ? slugify(String(body.slug)) : slugify(String(body.title));
  if (body.tags !== undefined) payload.tags = listFromInput(body.tags);
  if (body.seoKeywords !== undefined) payload.seoKeywords = listFromInput(body.seoKeywords);
  if (isCreate && !payload.status) payload.status = 'draft';
  return payload;
};

export const getPublicBlogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: any = { status: 'published' };
    if (req.query.category) filter.category = new RegExp(String(req.query.category), 'i');
    if (req.query.search) {
      filter.$or = [
        { title: new RegExp(String(req.query.search), 'i') },
        { excerpt: new RegExp(String(req.query.search), 'i') },
        { tags: new RegExp(String(req.query.search), 'i') },
      ];
    }
    const blogs = await Blog.find(filter).sort({ publishedAt: -1, createdAt: -1 });
    res.json({ success: true, count: blogs.length, blogs });
  } catch (err) { next(err); }
};

export const getPublicBlog = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, status: 'published' });
    if (!blog) { res.status(404).json({ success: false, message: 'Blog not found' }); return; }
    res.json({ success: true, blog });
  } catch (err) { next(err); }
};

export const getAdminBlogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const blogs = await Blog.find(adminQuery(req.query)).sort({ updatedAt: -1 });
    res.json({ success: true, count: blogs.length, blogs });
  } catch (err) { next(err); }
};

export const getAdminBlog = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) { res.status(404).json({ success: false, message: 'Blog not found' }); return; }
    res.json({ success: true, blog });
  } catch (err) { next(err); }
};

export const createBlog = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = normalizePayload(req.body, true);
    if (!payload.title || !payload.content || !payload.category) {
      res.status(400).json({ success: false, message: 'Title, content, and category are required' });
      return;
    }

    const blog = await Blog.create({
      ...payload,
      authorId: req.user?.id,
      authorName: req.user?.email,
      publishedAt: payload.status === 'published' ? new Date() : undefined,
    });
    await logAudit({ action: 'create', entityType: 'Blog', entityId: blog.id, entityName: blog.title, req, meta: { status: blog.status } });
    res.status(201).json({ success: true, message: 'Blog created', blog });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(400).json({ success: false, message: 'Blog slug already exists' });
      return;
    }
    next(err);
  }
};

export const updateBlog = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const current = await Blog.findById(req.params.id);
    if (!current) { res.status(404).json({ success: false, message: 'Blog not found' }); return; }

    const payload: any = normalizePayload(req.body);
    if (payload.status === 'published' && current.status !== 'published') payload.publishedAt = new Date();
    if (payload.status === 'archived' && current.status !== 'archived') payload.archivedAt = new Date();
    if (payload.status !== 'archived') payload.$unset = { archivedAt: 1, deletedAt: 1, deletedBy: 1 };

    const update = payload.$unset ? { $set: payload, $unset: payload.$unset } : { $set: payload };
    delete update.$set.$unset;

    const blog = await Blog.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!blog) { res.status(404).json({ success: false, message: 'Blog not found' }); return; }
    await logAudit({ action: 'update', entityType: 'Blog', entityId: blog.id, entityName: blog.title, req, meta: { status: blog.status } });
    res.json({ success: true, message: 'Blog updated', blog });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(400).json({ success: false, message: 'Blog slug already exists' });
      return;
    }
    next(err);
  }
};

export const archiveBlog = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { status: 'archived', archivedAt: new Date(), deletedAt: new Date(), deletedBy: req.user?.id },
      { new: true }
    );
    if (!blog) { res.status(404).json({ success: false, message: 'Blog not found' }); return; }
    await logAudit({ action: 'soft-delete', entityType: 'Blog', entityId: blog.id, entityName: blog.title, req });
    res.json({ success: true, message: 'Blog archived', blog });
  } catch (err) { next(err); }
};

export const hardDeleteBlog = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) { res.status(404).json({ success: false, message: 'Blog not found' }); return; }
    await logAudit({ action: 'hard-delete', entityType: 'Blog', entityId: blog.id, entityName: blog.title, req });
    res.json({ success: true, message: 'Blog permanently deleted' });
  } catch (err) { next(err); }
};

export const uploadBlogCover = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ success: false, message: 'No cover image provided' });
      return;
    }

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const filename = `${crypto.randomUUID()}.jpg`;
    await sharp(file.buffer)
      .resize({ width: 1600, height: 900, fit: 'cover' })
      .jpeg({ quality: 82 })
      .toFile(path.join(UPLOAD_DIR, filename));

    res.json({ success: true, url: `${req.protocol}://${req.get('host')}/uploads/blogs/${filename}` });
  } catch (err) { next(err); }
};
