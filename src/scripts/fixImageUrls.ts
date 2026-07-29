import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Room from '../models/Room.model';
import Hotel from '../models/Hotel.model';
import Blog from '../models/Blog.model';
import Service from '../models/Service.model';
import User from '../models/User.model';

dotenv.config();

// One-off fix for image URLs saved while pointing at a local dev backend —
// those got a permanent http://localhost:PORT/uploads/... string baked into
// Mongo, which never resolves once viewed from the live site. Rewrites the
// stale origin to the live backend origin, leaving the /uploads/... path as-is.
const LIVE_ORIGIN = process.env.LIVE_BACKEND_URL || 'https://rsgalaxybackend.onrender.com';
const STALE_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;

const fixUrl = (url?: string) =>
  url && STALE_ORIGIN_RE.test(url) ? url.replace(STALE_ORIGIN_RE, LIVE_ORIGIN) : url;

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to MongoDB');

  let changed = 0;

  const rooms = await Room.find({
    $or: [
      { innerImages: { $regex: STALE_ORIGIN_RE } },
      { outerImages: { $regex: STALE_ORIGIN_RE } },
      { washroomImages: { $regex: STALE_ORIGIN_RE } },
    ],
  });
  for (const room of rooms) {
    room.innerImages = room.innerImages.map((url) => fixUrl(url) as string);
    room.outerImages = room.outerImages.map((url) => fixUrl(url) as string);
    room.washroomImages = room.washroomImages.map((url) => fixUrl(url) as string);
    await room.save();
    changed++;
  }

  const hotels = await Hotel.find({
    $or: [{ image: { $regex: STALE_ORIGIN_RE } }, { images: { $regex: STALE_ORIGIN_RE } }],
  });
  for (const hotel of hotels) {
    hotel.image = fixUrl(hotel.image);
    hotel.images = hotel.images.map((url) => fixUrl(url) as string);
    await hotel.save();
    changed++;
  }

  const blogs = await Blog.find({ coverImage: { $regex: STALE_ORIGIN_RE } });
  for (const blog of blogs) {
    blog.coverImage = fixUrl(blog.coverImage);
    await blog.save();
    changed++;
  }

  const services = await Service.find({ image: { $regex: STALE_ORIGIN_RE } });
  for (const service of services) {
    service.image = fixUrl(service.image);
    await service.save();
    changed++;
  }

  const users = await User.find({
    $or: [{ avatar: { $regex: STALE_ORIGIN_RE } }, { idDocument: { $regex: STALE_ORIGIN_RE } }],
  });
  for (const user of users) {
    user.avatar = fixUrl(user.avatar);
    user.idDocument = fixUrl(user.idDocument);
    await user.save();
    changed++;
  }

  console.log(`Fixed ${changed} document(s) with a stale localhost image URL.`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
