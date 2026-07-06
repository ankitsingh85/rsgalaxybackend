import { Router } from 'express';
import {
  archiveBlog, createBlog, getAdminBlog, getAdminBlogs, getPublicBlog,
  getPublicBlogs, hardDeleteBlog, updateBlog, uploadBlogCover,
} from '../controller/blog.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadImages } from '../middleware/upload.middleware';

const router = Router();

router.get('/', getPublicBlogs);
router.get('/admin', authenticate, authorize('admin'), getAdminBlogs);
router.get('/admin/:id', authenticate, authorize('admin'), getAdminBlog);
router.post('/admin', authenticate, authorize('admin'), createBlog);
router.post('/admin/upload-cover', authenticate, authorize('admin'), uploadImages.single('cover'), uploadBlogCover);
router.put('/admin/:id', authenticate, authorize('admin'), updateBlog);
router.delete('/admin/:id', authenticate, authorize('admin'), archiveBlog);
router.delete('/admin/:id/permanent', authenticate, authorize('admin'), hardDeleteBlog);
router.get('/:slug', getPublicBlog);

export default router;
