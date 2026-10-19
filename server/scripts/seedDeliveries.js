// server/scripts/seedDeliveries.js   (DEV ONLY)  Usage: node scripts/seedDeliveries.js
// Creates 3 waiting deliveries with made-up order ids, to try the delivery APIs
// before Member 3's orders exist. Run once; running again adds 3 more.
require('dotenv').config();
const mongoose = require('mongoose');
const Delivery = require('../src/models/Delivery');

const samples = [
  { name: 'Asha Mehta', phone: '9876500001', line1: '12 Garden Road', city: 'Ahmedabad', postalCode: '380015', items: 3 },
  { name: 'Rohan Desai', phone: '9876500002', line1: '45 Lake View Society', city: 'Surat', postalCode: '395007', items: 2 },
  { name: 'Kiran Shah', phone: '9876500003', line1: '7 Station Road', city: 'Rajkot', postalCode: '360005', items: 5 },
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  for (const [i, s] of samples.entries()) {
    await Delivery.create({
      order: new mongoose.Types.ObjectId(),
      orderNumber: `T-${900 + i}`,
      pickup: { name: 'Demo branch', address: { line1: '1 Main Street', city: s.city } },
      dropoff: { address: { line1: s.line1, city: s.city, postalCode: s.postalCode } },
      customerName: s.name, customerPhone: s.phone, itemCount: s.items,
      timeline: [{ status: 'pending', at: new Date() }],
    });
    console.log('created delivery for', s.name);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
