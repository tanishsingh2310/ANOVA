// server/models/Customer.js  (Member 4)
// One Customer profile per User. Identity (name, email, password, role) stays in
// Member 1's User model; this collection only holds customer-specific data.
const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home', trim: true, maxlength: 30 },
  line1: { type: String, required: [true, 'Address line is required'], trim: true, maxlength: 200 },
  city: { type: String, trim: true, maxlength: 80 },
  postalCode: { type: String, trim: true, maxlength: 12 },
  location: {
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },
  },
  isDefault: { type: Boolean, default: false },
});

const customerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9+()\-\s]{7,15}$/, 'Enter a valid phone number'],
  },
  addresses: {
    type: [addressSchema],
    validate: [(v) => v.length <= 10, 'You can save up to 10 addresses'],
  },
  preferences: {
    dietary: [{ type: String, trim: true, lowercase: true }], // e.g. "vegetarian"
    // Optional. Kept so the model still fits the contract's multi-branch design.
    // The UI does not use it while the team treats this as one restaurant.
    favouriteBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  },
  loyaltyPoints: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
