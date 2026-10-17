// server/services/deliveryService.js  (Member 4, Module 3)
const Delivery = require('../models/Delivery');

const ACTIVE = ['pending', 'assigned', 'picked_up', 'on_the_way'];

// What a rider may do: exactly one step forward, nothing else.
const RIDER_NEXT = { assigned: 'picked_up', picked_up: 'on_the_way', on_the_way: 'delivered' };

// For Member 3: call this after saving a delivery-type order.
//   await createDelivery({ orderId, orderNumber, branchId, pickup, dropoff,
//                          customerUser, customerName, customerPhone, itemCount });
// pickup:  { name, address: { line1, city, postalCode }, location?: { lat, lng } }
// dropoff: { address: { line1, city, postalCode }, location?: { lat, lng } }
async function createDelivery({ orderId, orderNumber, branchId, pickup, dropoff, customerUser, customerName, customerPhone, itemCount }) {
  return Delivery.create({
    order: orderId,
    orderNumber,
    branch: branchId,
    pickup,
    dropoff,
    customerUser,
    customerName,
    customerPhone,
    itemCount,
    status: 'pending',
    timeline: [{ status: 'pending', at: new Date() }],
  });
}

// The only place that knows who the assignable delivery staff are. Swap this body
// if the team decides they are Employee records instead of Users.
async function listDeliveryStaff(User) {
  return User.find({ role: 'delivery' }).select('name email').sort({ name: 1 }).lean();
}

module.exports = { ACTIVE, RIDER_NEXT, createDelivery, listDeliveryStaff };
