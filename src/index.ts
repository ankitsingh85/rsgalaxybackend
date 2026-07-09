import path from 'path';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/db';
import { apiLimiter } from './middleware/rateLimit.middleware';

// Route imports
import authRoutes from './routes/auth.routes';
import hotelRoutes from './routes/hotel.routes';
import roomRoutes from './routes/room.routes';
import bookingRoutes from './routes/booking.routes';
import userRoutes from './routes/user.routes';
import contactRoutes from './routes/contact.routes';
import auditRoutes from './routes/audit.routes';
import couponRoutes from './routes/coupon.routes';
import blogRoutes from './routes/blog.routes';
import notificationRoutes from './routes/notification.routes';
import serviceRoutes from './routes/service.routes';
import menuItemRoutes from './routes/menuItem.routes';
import orderRoutes from './routes/order.routes';
import amenityUsageRoutes from './routes/amenityUsage.routes';
import staffRoutes from './routes/staff.routes';
import savedCardRoutes from './routes/savedCard.routes';
import reviewRoutes from './routes/review.routes';

import { errorHandler, notFound } from './middleware/error.middleware';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Render sits the app behind a single reverse proxy, which sets X-Forwarded-For.
// Without this, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR and
// can't tell clients apart by IP.
app.set('trust proxy', 1);

const allowedOrigins = (process.env.CLIENT_URL ||
  'http://localhost:3000,https://rsgalaxy-frontend.vercel.app,https://rsgalaxy-frontend-5825.vercel.app')
  .split(',')
  .map(origin => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

console.log('CORS allowed origins:', allowedOrigins);

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const normalized = origin?.replace(/\/$/, '');
    if (!normalized || allowedOrigins.includes(normalized)) {
      callback(null, true);
      return;
    }

    console.warn(`CORS blocked for origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

// General API rate limit — 200/15min was exhausted by normal admin/manager dashboard use
// alone (8-10 parallel GETs per page load), which meant even login (also under /api/)
// started getting blocked. Auth's own dedicated limiter is applied in auth.routes.ts.
app.use('/api/', apiLimiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('dev'));

// Uploaded images (cross-origin resource policy relaxed so the frontend, on a different port, can load them)
app.use('/uploads', (_req: Request, res: Response, next) => {
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: '🏨 RS Galaxy Hotel API',
    version: '1.0.0',
    status: 'running',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/menu-items', menuItemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/amenity-usage', amenityUsageRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/saved-cards', savedCardRoutes);
app.use('/api/reviews', reviewRoutes);

// Error handlers
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 RS Galaxy API Server running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}\n`);
});
