// models/Review.js
const reviewSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  foodRating: { type: Number, min: 1, max: 5 },
  deliveryRating: { type: Number, min: 1, max: 5 },
  comment: String,
}, { timestamps: true });
reviewSchema.index({ customer: 1, order: 1 }, { unique: true }); // one review per order