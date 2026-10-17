// server/models/Delivery.js  (Member 4, Module 3)
// One Delivery per delivery order. It stores a SNAPSHOT of what the rider needs
// (addresses, customer name and phone), so riders never need access to orders or
// customer profiles. Delivery status is its own state machine, separate from Order status.
const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  label: String,
  line1: { type: String, trim: true },
  city: { type: String, trim: true },
  postalCode: { type: String, trim: true },
}, { _id: false });

const pointSchema = new mongoose.Schema({
  lat: { type: Number, min: -90, max: 90 },
  lng: { type: Number, min: -180, max: 180 },
}, { _id: false });

const STATUSES = ['pending', 'assigned', 'picked_up', 'on_the_way', 'delivered', 'cancelled'];

const deliverySchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  orderNumber: String,
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

  pickup: { name: String, address: addressSchema, location: pointSchema },
  dropoff: {
    address: { type: addressSchema, required: true },
    location: pointSchema,
  },

  customerUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // lets the customer track their own delivery
  customerName: { type: String, trim: true },
  customerPhone: { type: String, trim: true },
  itemCount: { type: Number, default: 0, min: 0 },

  // ASSUMPTION: delivery staff are Users with role "delivery". If the team decides they
  // are Employee records, change this ref and services/deliveryService.js only.
  deliveryStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  status: { type: String, enum: STATUSES, default: 'pending' },
  timeline: [{
    status: { type: String, enum: STATUSES },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    _id: false,
  }],
  assignedAt: Date,
  deliveredAt: Date,
  cancelledReason: { type: String, trim: true, maxlength: 200 },
}, { timestamps: true });

deliverySchema.index({ status: 1, createdAt: -1 });
deliverySchema.index({ deliveryStaff: 1, status: 1 });

module.exports = mongoose.model('Delivery', deliverySchema);
module.exports.STATUSES = STATUSES;
