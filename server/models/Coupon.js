// server/models/Coupon.js  (Member 4, Module 5)
// A coupon is also an "offer" when isPublic is true (shown on the customer Offers page).
const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String, required: [true, 'Code is required'], unique: true, trim: true, uppercase: true,
    match: [/^[A-Z0-9_-]{3,20}$/, 'Code must be 3 to 20 letters, numbers, - or _'],
  },
  title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 300 },
  campaign: { type: String, trim: true, maxlength: 60 }, // optional label to group coupons
  discountType: { type: String, enum: ['percent', 'fixed'], required: true },
  discountValue: { type: Number, required: true, min: [0.01, 'Discount must be more than 0'] },
  minOrderAmount: { type: Number, default: 0, min: 0 },
  maxDiscount: { type: Number, min: 0 }, // cap for percent coupons
  validFrom: Date,
  validTo: Date,
  usageLimit: { type: Number, min: 1 },                 // total uses across all customers
  perCustomerLimit: { type: Number, default: 1, min: 1 },
  usedCount: { type: Number, default: 0, min: 0 },
  branches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }], // empty = every branch
  isPublic: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

couponSchema.pre('validate', function () {
  if (this.discountType === 'percent' && this.discountValue > 100) {
    this.invalidate('discountValue', 'A percent discount cannot be more than 100');
  }
  if (this.validFrom && this.validTo && this.validTo <= this.validFrom) {
    this.invalidate('validTo', 'The end date must be after the start date');
  }
});

module.exports = mongoose.model('Coupon', couponSchema);
