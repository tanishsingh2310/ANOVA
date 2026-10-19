// server/scripts/seedFeedbackTest.js   (DEV ONLY)
// Usage: node scripts/seedFeedbackTest.js <customerUserId>
// Member 3's orders do not exist yet, so this adds ONE finished test order straight into the
// "orders" collection of YOUR dev database, so you can try reviews and complaints for real.
// Delete it afterwards. Never run this against the shared ANOVA database.
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  const userId = process.argv[2];
  if (!mongoose.isValidObjectId(userId)) throw new Error('Pass the customer user id printed by seedUser.js');
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const r = await mongoose.connection.collection('orders').insertOne({
    customer: new mongoose.Types.ObjectId(userId),
    orderNumber: `T-${Math.floor(Math.random() * 900 + 100)}`,
    orderType: 'delivery',
    status: 'delivered',
    createdAt: new Date(),
  });
  console.log('Test order id:', r.insertedId.toString());
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
