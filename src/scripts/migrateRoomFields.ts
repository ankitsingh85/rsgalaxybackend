import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Room from '../models/Room.model';

dotenv.config();

// One-off migration for the room-schema overhaul (removed roomNumber/floor,
// split capacity into capacityAdults/capacityKids, split images into
// innerImages/outerImages/washroomImages). Carries the old data — still present
// in Mongo on pre-migration documents since Mongoose only adds new schema
// fields, it doesn't strip old ones — into the new fields, then clears it.
const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected to MongoDB');

  const rooms = await mongoose.connection.collection('rooms').find({}).toArray();
  let changed = 0;

  for (const room of rooms) {
    const update: any = {};
    const unset: any = {};

    if (typeof room.capacity === 'number') {
      update.capacityAdults = room.capacity;
      unset.capacity = '';
    }
    if (Array.isArray(room.images) && room.images.length > 0 && (!room.innerImages || room.innerImages.length === 0)) {
      update.innerImages = room.images;
    }
    if (room.images !== undefined) unset.images = '';
    if (room.roomNumber !== undefined) unset.roomNumber = '';
    if (room.floor !== undefined) unset.floor = '';

    if (Object.keys(update).length === 0 && Object.keys(unset).length === 0) continue;

    const ops: any = {};
    if (Object.keys(update).length) ops.$set = update;
    if (Object.keys(unset).length) ops.$unset = unset;

    await mongoose.connection.collection('rooms').updateOne({ _id: room._id }, ops);
    changed++;
  }

  console.log(`Migrated ${changed} room document(s).`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
