require('dotenv').config();
const jwt = require('jsonwebtoken');
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  try {
    await connectDB();

    const user = await User.findOneAndUpdate(
      { email: 'test@customer.com' },
      {
        name: 'Test Customer',
        email: 'test@customer.com',
        role: 'customer',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const token = jwt.sign(
      { id: user._id.toString(), role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    console.log('User id:', user._id.toString());
    console.log('JWT:', token);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
