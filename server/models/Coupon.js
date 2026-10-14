// models/Coupon.js
const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  description: String,
  discountType: { type: String, enum: ['percent', 'fixed'], required: true },
  discountValue: { type: Number, required: true },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscount: Number,
  validFrom: Date,
  validTo: Date,
  usageLimit: Number,
  usedCount: { type: Number, default: 0 },
  branches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }], // empty = all
  isActive: { type: Boolean, default: true },
}, { timestamps: true });