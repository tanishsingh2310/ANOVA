// server/services/orderGateway.js  (Member 4)
// The ONLY place Module 6 reads orders. Orders belong to Member 3, whose model does not exist
// yet, so this reads the "orders" collection directly and rests on these ASSUMPTIONS:
//   - collection name "orders"
//   - order.customer holds the User id OR the Customer profile id (both are accepted)
//   - order.status is "delivered" (delivery) or "completed" (takeaway) when finished
//   - optional fields: branch, orderType, orderNumber
// When Member 3 publishes the real Order model, change this file only.
// If an order cannot be found or does not belong to the customer, callers get null (never a bypass).
const mongoose = require('mongoose');
const Customer = require('../models/Customer');

const COMPLETED = ['delivered', 'completed'];

async function findCustomerOrder(orderId, userId) {
  if (!mongoose.isValidObjectId(orderId) || !mongoose.isValidObjectId(userId)) return null;
  const ids = [new mongoose.Types.ObjectId(userId)];
  const profile = await Customer.findOne({ user: userId }).select('_id').lean();
  if (profile) ids.push(profile._id);

  return mongoose.connection.collection('orders').findOne(
    { _id: new mongoose.Types.ObjectId(orderId), customer: { $in: ids } },
    { projection: { status: 1, branch: 1, orderType: 1, orderNumber: 1 } }
  );
}

const isCompleted = (order) => !!order && COMPLETED.includes(order.status);

module.exports = { COMPLETED, findCustomerOrder, isCompleted };
