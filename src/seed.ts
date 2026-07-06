import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.model';
import Hotel from './models/Hotel.model';
import Room from './models/Room.model';
import Booking from './models/Booking.model';
import { generateBookingRef } from './utils/jwt';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rs_galaxy_hotel');
    console.log('✅ Connected to MongoDB');

    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Hotel.deleteMany({});
    await Room.deleteMany({});
    await Booking.deleteMany({});

    // ── USERS ──
    console.log('👥 Creating users...');
    const admin = await User.create({
      name: 'Super Admin', email: 'admin@rsgalaxy.com', password: 'admin123',
      role: 'admin', phone: '+91-800-100-0001',
    });

    const manager1 = await User.create({
      name: 'Sarah Johnson', email: 'sarah@rsgalaxy.com', password: 'manager123',
      role: 'manager', phone: '+91-800-100-0002',
    });

    const manager2 = await User.create({
      name: 'Michael Chen', email: 'michael@rsgalaxy.com', password: 'manager123',
      role: 'manager', phone: '+91-800-100-0003',
    });

    const customer = await User.create({
      name: 'John Doe', email: 'john@example.com', password: 'user123',
      role: 'user', phone: '+91-900-100-0001',
    });

    await User.create({
      name: 'Jane Smith', email: 'jane@example.com', password: 'user123',
      role: 'user', phone: '+91-900-100-0002',
    });

    // ── HOTELS ──
    console.log('🏨 Creating hotels...');
    const goa = await Hotel.create({
      name: 'RS Galaxy Goa Beach Resort',
      location: 'Calangute Beach Road, North Goa',
      city: 'Goa', country: 'India',
      description: 'Wake up to the sound of waves at RS Galaxy Goa Beach Resort. Beachfront luxury with private beach, infinity pool, spa, and seafood dining. Always with you.',
      rating: 4.8,
      image: 'https://images.pexels.com/photos/261101/pexels-photo-261101.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',
      amenities: ['Private Beach', 'Infinity Pool', 'Spa', 'Water Sports', 'Restaurant', 'Bar', 'WiFi', 'Concierge'],
      totalRooms: 120,
      priceRange: '₹8,500 - ₹45,000',
      managerId: manager1.id, managerName: manager1.name,
      status: 'active',
    });
    manager1.managedHotelId = goa.id;
    await manager1.save();

    const rishikesh = await Hotel.create({
      name: 'RS Galaxy Rishikesh Retreat',
      location: 'Tapovan, Laxman Jhula, Rishikesh',
      city: 'Rishikesh', country: 'India',
      description: 'Perched on the sacred Ganges with Himalayan views. Riverside yoga, Ayurvedic spa, meditation gardens. Always with you.',
      rating: 4.7,
      image: 'https://images.pexels.com/photos/19041828/pexels-photo-19041828.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',
      amenities: ['Riverside Yoga', 'Ayurvedic Spa', 'Meditation Garden', 'River View', 'Restaurant', 'Trekking', 'WiFi'],
      totalRooms: 80,
      priceRange: '₹7,000 - ₹35,000',
      managerId: manager2.id, managerName: manager2.name,
      status: 'active',
    });
    manager2.managedHotelId = rishikesh.id;
    await manager2.save();

    // ── ROOMS ──
    console.log('🛏️  Creating rooms...');
    const room1 = await Room.create({
      hotelId: goa.id, hotelName: goa.name,
      roomNumber: '101', type: 'standard', price: 8500, capacity: 2,
      description: 'Bright standard room with sea view balcony.',
      amenities: ['King Bed', 'Sea View', 'WiFi', 'AC', 'Mini Bar', 'TV'],
      images: ['https://images.pexels.com/photos/3688261/pexels-photo-3688261.jpeg?w=600'],
      status: 'available', floor: 1, size: 38,
    });

    const room2 = await Room.create({
      hotelId: goa.id, hotelName: goa.name,
      roomNumber: '201', type: 'deluxe', price: 14500, capacity: 2,
      description: 'Deluxe beachfront room with plunge pool.',
      amenities: ['King Bed', 'Plunge Pool', 'Sunset View', 'WiFi', 'AC', 'Jacuzzi'],
      images: ['https://images.pexels.com/photos/14464348/pexels-photo-14464348.jpeg?w=600'],
      status: 'available', floor: 2, size: 60,
    });

    await Room.create({
      hotelId: goa.id, hotelName: goa.name,
      roomNumber: '301', type: 'suite', price: 28000, capacity: 4,
      description: 'Flagship beach suite with private entry.',
      amenities: ['2 Bedrooms', 'Private Beach', 'Rooftop Jacuzzi', 'Butler'],
      images: ['https://images.pexels.com/photos/37240654/pexels-photo-37240654.jpeg?w=600'],
      status: 'available', floor: 3, size: 130,
    });

    await Room.create({
      hotelId: rishikesh.id, hotelName: rishikesh.name,
      roomNumber: '101', type: 'standard', price: 7000, capacity: 2,
      description: 'Forest view room with balcony.',
      amenities: ['Queen Bed', 'Forest View', 'WiFi', 'AC', 'Yoga Mat'],
      images: ['https://images.pexels.com/photos/19332135/pexels-photo-19332135.jpeg?w=600'],
      status: 'available', floor: 1, size: 34,
    });

    await Room.create({
      hotelId: rishikesh.id, hotelName: rishikesh.name,
      roomNumber: '201', type: 'deluxe', price: 13000, capacity: 2,
      description: 'Deluxe Ganges river view retreat.',
      amenities: ['King Bed', 'Ganges View', 'Open Sit-Out', 'WiFi', 'Ayurvedic Kit'],
      images: ['https://images.pexels.com/photos/2725675/pexels-photo-2725675.jpeg?w=600'],
      status: 'available', floor: 2, size: 55,
    });

    await Room.create({
      hotelId: rishikesh.id, hotelName: rishikesh.name,
      roomNumber: '301', type: 'suite', price: 25000, capacity: 4,
      description: 'Himalayan Suite with meditation deck.',
      amenities: ['2 Bedrooms', 'Himalayan View', 'Meditation Deck', 'In-Suite Spa', 'Butler'],
      images: ['https://images.pexels.com/photos/15196909/pexels-photo-15196909.jpeg?w=600'],
      status: 'available', floor: 3, size: 110,
    });

    // ── BOOKINGS ──
    console.log('📅 Creating sample bookings...');
    await Booking.create({
      bookingRef: generateBookingRef(),
      userId: customer.id, userName: customer.name, userEmail: customer.email,
      hotelId: goa.id, hotelName: goa.name,
      roomId: room2.id, roomNumber: room2.roomNumber, roomType: room2.type,
      checkIn: new Date('2025-08-15'), checkOut: new Date('2025-08-20'),
      guests: 2, totalPrice: 72500,
      status: 'confirmed', paymentStatus: 'paid',
      specialRequests: 'Late check-in. Champagne on arrival please.',
    });

    await Booking.create({
      bookingRef: generateBookingRef(),
      userId: customer.id, userName: customer.name, userEmail: customer.email,
      hotelId: rishikesh.id, hotelName: rishikesh.name,
      roomId: room1.id, roomNumber: '101', roomType: 'standard',
      checkIn: new Date('2025-09-10'), checkOut: new Date('2025-09-15'),
      guests: 2, totalPrice: 35000,
      status: 'pending', paymentStatus: 'pending',
    });

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📋 Demo Accounts:');
    console.log('  Admin:     admin@rsgalaxy.com / admin123');
    console.log('  Manager:   sarah@rsgalaxy.com / manager123');
    console.log('  Customer:  john@example.com / user123');
    console.log('\n🚀 Start server with: npm run dev\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();
