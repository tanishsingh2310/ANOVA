// server/scripts/seedUser.js   (DEV ONLY)
// Usage: node scripts/seedUser.js [customer|manager|delivery]
// Creates/updates a test user and prints a 1-day token for testing.
require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const role = process.argv[2] || 'customer';

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const email = `test-${role}@example.com`;
  const user = await User.findOneAndUpdate(
    { email },
    { name: `Test ${role}`, email, role },
    { upsert: true, new: true }
  );
  console.log('User id:', user._id.toString());
  console.log('Role   :', role);
  console.log('TOKEN  :\n' + jwt.sign({ id: user._id, role }, process.env.JWT_SECRET, { expiresIn: '1d' }));
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
