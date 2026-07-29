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
    // Meal add-ons are an EXTRA cost per night on top of the room rate, not a full
    // alternate rate — guests can combine multiple add-ons at once.
    const mealPackages = (base: number) => [
      { name: 'Add Breakfast', price: Math.round(base * 0.08), breakfast: true, lunch: false, dinner: false },
      { name: 'Add All Meals', price: Math.round(base * 0.20), breakfast: true, lunch: true, dinner: true },
    ];

    const room1 = await Room.create({
      hotelId: goa.id, hotelName: goa.name,
      type: 'Standard', bedType: '1 King Bed', price: 8500,
      capacityAdults: 2, capacityKids: 1,
      description: 'Bright standard room with sea view balcony.',
      amenities: ['Sea View', 'WiFi', 'AC', 'Mini Bar', 'TV'],
      innerImages: ['https://images.pexels.com/photos/3688261/pexels-photo-3688261.jpeg?w=600'],
      outerImages: [], washroomImages: [],
      mealPackages: mealPackages(8500),
      status: 'available', size: 38,
    });

    const room2 = await Room.create({
      hotelId: goa.id, hotelName: goa.name,
      type: 'Deluxe', bedType: '1 King Bed', price: 14500,
      capacityAdults: 2, capacityKids: 1,
      description: 'Deluxe beachfront room with plunge pool.',
      amenities: ['Plunge Pool', 'Sunset View', 'WiFi', 'AC', 'Jacuzzi'],
      innerImages: ['https://images.pexels.com/photos/14464348/pexels-photo-14464348.jpeg?w=600'],
      outerImages: [], washroomImages: [],
      mealPackages: mealPackages(14500),
      status: 'available', size: 60,
    });

    await Room.create({
      hotelId: goa.id, hotelName: goa.name,
      type: 'Suite', bedType: '2 King Beds', price: 28000,
      capacityAdults: 4, capacityKids: 2,
      description: 'Flagship beach suite with private entry.',
      amenities: ['2 Bedrooms', 'Private Beach', 'Rooftop Jacuzzi', 'Butler'],
      innerImages: ['https://images.pexels.com/photos/37240654/pexels-photo-37240654.jpeg?w=600'],
      outerImages: [], washroomImages: [],
      mealPackages: mealPackages(28000),
      status: 'available', size: 130,
    });

    await Room.create({
      hotelId: rishikesh.id, hotelName: rishikesh.name,
      type: 'Standard', bedType: '1 Queen Bed', price: 7000,
      capacityAdults: 2, capacityKids: 1,
      description: 'Forest view room with balcony.',
      amenities: ['Forest View', 'WiFi', 'AC', 'Yoga Mat'],
      innerImages: ['https://images.pexels.com/photos/19332135/pexels-photo-19332135.jpeg?w=600'],
      outerImages: [], washroomImages: [],
      mealPackages: mealPackages(7000),
      status: 'available', size: 34,
    });

    await Room.create({
      hotelId: rishikesh.id, hotelName: rishikesh.name,
      type: 'Deluxe', bedType: '1 King Bed', price: 13000,
      capacityAdults: 2, capacityKids: 1,
      description: 'Deluxe Ganges river view retreat.',
      amenities: ['Ganges View', 'Open Sit-Out', 'WiFi', 'Ayurvedic Kit'],
      innerImages: ['https://images.pexels.com/photos/2725675/pexels-photo-2725675.jpeg?w=600'],
      outerImages: [], washroomImages: [],
      mealPackages: mealPackages(13000),
      status: 'available', size: 55,
    });

    await Room.create({
      hotelId: rishikesh.id, hotelName: rishikesh.name,
      type: 'Suite', bedType: '2 King Beds', price: 25000,
      capacityAdults: 4, capacityKids: 2,
      description: 'Himalayan Suite with meditation deck.',
      amenities: ['2 Bedrooms', 'Himalayan View', 'Meditation Deck', 'In-Suite Spa', 'Butler'],
      innerImages: ['https://images.pexels.com/photos/15196909/pexels-photo-15196909.jpeg?w=600'],
      outerImages: [], washroomImages: [],
      mealPackages: mealPackages(25000),
      status: 'available', size: 110,
    });

    // ── BOOKINGS ──
    console.log('📅 Creating sample bookings...');
    await Booking.create({
      bookingRef: generateBookingRef(),
      userId: customer.id, userName: customer.name, userEmail: customer.email,
      hotelId: goa.id, hotelName: goa.name,
      roomId: room2.id, roomType: room2.type,
      checkIn: new Date('2025-08-15'), checkOut: new Date('2025-08-20'),
      guests: 2, totalPrice: 72500,
      status: 'confirmed', paymentStatus: 'paid',
      specialRequests: 'Late check-in. Champagne on arrival please.',
    });

    await Booking.create({
      bookingRef: generateBookingRef(),
      userId: customer.id, userName: customer.name, userEmail: customer.email,
      hotelId: rishikesh.id, hotelName: rishikesh.name,
      roomId: room1.id, roomType: 'Standard',
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
