require('dotenv').config();

const mongoose = require('mongoose');
const connectDatabase = require('../config/db');
const User = require('../models/User');
const FoodListing = require('../models/FoodListing');

async function findOrCreateUser(details) {
  let user = await User.findOne({ email: details.email });
  if (!user) user = await User.create(details);
  return user;
}

async function seed() {
  await connectDatabase();

  const donor = await findOrCreateUser({
    name: 'Campus Canteen',
    email: 'canteen@foodbridge.demo',
    password: 'Password123!',
    role: 'donor',
    phone: '9876543210',
    organizationName: 'Campus Canteen'
  });
  const volunteer = await findOrCreateUser({
    name: 'Rahul Volunteer',
    email: 'volunteer@foodbridge.demo',
    password: 'Password123!',
    role: 'volunteer',
    phone: '9876501234',
    volunteerProfile: { preferredPincode: '110001', availableHours: '4 PM - 8 PM' }
  });
  await findOrCreateUser({
    name: 'FoodBridge Admin',
    email: 'admin@foodbridge.demo',
    password: 'Password123!',
    role: 'admin'
  });

  const demoListings = [
    {
      title: 'Fresh Vegetable Pulao',
      category: 'Cooked Meal',
      description: 'Freshly prepared vegetarian pulao, packed in meal boxes.',
      quantity: 24,
      unit: 'meals',
      preparedAt: new Date(),
      expiryAt: new Date(Date.now() + 5 * 60 * 60 * 1000),
      tags: ['vegetarian', 'rice'],
      pickup: { address: 'Main Block, Campus Road', pincode: '110001', contactName: 'Campus Canteen', contactPhone: '9876543210' },
      donor: donor._id
    },
    {
      title: 'Packed Bread and Biscuits',
      category: 'Packaged Food',
      description: 'Sealed snack packs from a student event.',
      quantity: 35,
      unit: 'packs',
      preparedAt: new Date(),
      expiryAt: new Date(Date.now() + 20 * 60 * 60 * 1000),
      tags: ['snacks', 'sealed'],
      pickup: { address: 'Student Activity Centre', pincode: '110001', contactName: 'Campus Canteen', contactPhone: '9876543210' },
      donor: donor._id
    }
  ];

  for (const data of demoListings) {
    await FoodListing.updateOne(
      { title: data.title, donor: donor._id, status: 'available' },
      { $setOnInsert: data },
      { upsert: true }
    );
  }

  console.log('Demo users and listings are ready. Volunteer account:', volunteer.email);
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error(error);
  mongoose.disconnect();
  process.exit(1);
});
