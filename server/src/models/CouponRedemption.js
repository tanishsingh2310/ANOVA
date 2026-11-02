// server/models/CouponRedemption.js  (Member 4)
// One row per successful use of a coupon on an order. Used for per-customer limits and reports.
const mongoose = require('mongoose');

const redemptionSchema = new mongoose.Schema({
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  amount: { type: Number, required: true, min: 0 }, // discount actually given
}, { timestamps: true });

redemptionSchema.index({ coupon: 1, order: 1 }, { unique: true }); // an order can use a coupon once
redemptionSchema.index({ coupon: 1, customer: 1 });

module.exports = mongoose.model('CouponRedemption', redemptionSchema);
