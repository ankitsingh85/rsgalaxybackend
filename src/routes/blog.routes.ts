import { Router } from 'express';
import {
  archiveBlog, createBlog, getAdminBlog, getAdminBlogs, getPublicBlog,
  getPublicBlogs, hardDeleteBlog, updateBlog, uploadBlogCover,
} from '../controller/blog.controller';
import { authenticate, authorize, requirePermission } from '../middleware/auth.middleware';
import { uploadImages } from '../middleware/upload.middleware';

const router = Router();

router.get('/', getPublicBlogs);
router.get('/admin', authenticate, authorize('admin', 'manager'), requirePermission('blogs', 'view'), getAdminBlogs);
router.get('/admin/:id', authenticate, authorize('admin', 'manager'), requirePermission('blogs', 'view'), getAdminBlog);
router.post('/admin', authenticate, authorize('admin', 'manager'), requirePermission('blogs', 'edit'), createBlog);
router.post('/admin/upload-cover', authenticate, authorize('admin', 'manager'), requirePermission('blogs', 'edit'), uploadImages.single('cover'), uploadBlogCover);
router.put('/admin/:id', authenticate, authorize('admin', 'manager'), requirePermission('blogs', 'edit'), updateBlog);
router.delete('/admin/:id', authenticate, authorize('admin', 'manager'), requirePermission('blogs', 'delete'), archiveBlog);
router.delete('/admin/:id/permanent', authenticate, authorize('admin'), hardDeleteBlog);
router.get('/:slug', getPublicBlog);

export default router;
