// server/models/Review.js  (Member 4, Module 6)
// One review per order, written by the customer who placed it after it was delivered or collected.
const mongoose = require('mongoose');

const rating = (required) => ({
  type: Number,
  required: required ? [true, 'A rating is required'] : false,
  min: [1, 'Ratings go from 1 to 5'],
  max: [5, 'Ratings go from 1 to 5'],
  validate: { validator: Number.isInteger, message: 'Ratings must be whole numbers' },
});

const reviewSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  orderNumber: String,
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  orderType: String,
  foodRating: rating(true),
  deliveryRating: rating(false), // only for delivery orders
  comment: { type: String, trim: true, maxlength: [500, 'Comments can be up to 500 characters'] },
  isHidden: { type: Boolean, default: false }, // staff moderation: hidden reviews do not count in averages
  reply: {
    text: { type: String, trim: true, maxlength: 500 },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: Date,
  },
}, { timestamps: true });

reviewSchema.index({ branch: 1, isHidden: 1 });
reviewSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
