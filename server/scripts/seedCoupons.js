// server/scripts/seedCoupons.js   (DEV ONLY)  Usage: node scripts/seedCoupons.js
// Creates three sample coupons that work at every branch. Safe to run again.
require('dotenv').config();
const mongoose = require('mongoose');
const Coupon = require('../src/models/Coupon');

const samples = [
  { code: 'WELCOME10', title: 'Welcome offer', description: '10% off your order, up to 100.', discountType: 'percent', discountValue: 10, minOrderAmount: 200, maxDiscount: 100, perCustomerLimit: 1, isPublic: true },
  { code: 'FLAT50', title: 'Flat 50 off', description: '50 off orders above 300.', discountType: 'fixed', discountValue: 50, minOrderAmount: 300, perCustomerLimit: 3, isPublic: true },
  { code: 'VIP25', title: 'Private offer', description: '25% off, shared by code only.', discountType: 'percent', discountValue: 25, minOrderAmount: 0, maxDiscount: 200, perCustomerLimit: 1, isPublic: false },
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  for (const s of samples) {
    await Coupon.updateOne({ code: s.code }, { $setOnInsert: s }, { upsert: true });
    console.log('ready:', s.code);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
