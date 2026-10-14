// models/Customer.js
const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home' },
  line1: { type: String, required: true },
  city: String,
  postalCode: String,
  location: { lat: Number, lng: Number },
  isDefault: { type: Boolean, default: false },
});

const customerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  phone: String,
  addresses: [addressSchema],
  preferences: {
    dietary: [String],          // e.g. "vegetarian"
    favouriteBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  },
  loyaltyPoints: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);