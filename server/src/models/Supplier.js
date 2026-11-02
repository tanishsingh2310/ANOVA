const mongoose = require('mongoose');

/**
 * ANOVA SUPPLIER MODEL (Module 2 Deliverable)
 * Defines vendor profiles, contact details, supplied catalog, and links to Member 1's User account
 */
const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  category: { type: String, required: true },
  contactPerson: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  phone: { type: String, required: true },
  city: { type: String, default: 'Mumbai' },
  leadTimeDays: { type: Number, default: 2, min: 0 },
  paymentTerms: { type: String, default: 'Net 30' },
  taxId: { type: String, trim: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  rating: { type: Number, default: 4.5, min: 1, max: 5 },

  // Cross-Module Reference: Link to Member 1's User account
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

  // Supported/serviced branches (Supports ObjectIds or branch codes)
  servicedBranches: [{ type: String }],

  // Catalog of ingredients supplied by this vendor
  suppliedIngredients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' }]
}, { timestamps: true });

supplierSchema.index({ code: 1, status: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
