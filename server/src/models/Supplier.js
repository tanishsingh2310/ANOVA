const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  category: { type: String, required: true },
  contactPerson: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true },
  city: { type: String, default: 'Mumbai' },
  leadTimeDays: { type: Number, default: 2, min: 0 },
  paymentTerms: { type: String, default: 'Net 30' },
  taxId: { type: String, trim: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  rating: { type: Number, default: 4.5, min: 1, max: 5 }
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);
