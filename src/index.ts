import path from 'path';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import connectDB from './config/db';

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

import { errorHandler, notFound } from './middleware/error.middleware';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_URL ||
  'http://localhost:3000,https://rsgalaxy-frontend-5825.vercel.app')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 200,                   // requests per IP
  message: 'Too many requests, please try again later.',
});
app.use('/api/', limiter);

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

// Error handlers
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 RS Galaxy API Server running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}\n`);
});
