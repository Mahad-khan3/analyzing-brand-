const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');

const seedAdmin = async () => {
  await mongoose.connect(env.MONGODB_URI);
  const email = process.env.ADMIN_EMAIL || 'admin@brandpilot.ai';
  const password = process.env.ADMIN_PASSWORD || 'Admin@1234';
  const name = process.env.ADMIN_NAME || 'BrandPilot Admin';

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin';
    existing.isVerified = true;
    await existing.save();
    console.log('Admin already exists, role ensured:', email);
  } else {
    await User.create({ name, email, password, role: 'admin', isVerified: true });
    console.log('Admin created:', email);
  }
  await mongoose.disconnect();
  process.exit(0);
};

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
