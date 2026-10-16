const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batchNumber: { type: String, required: true },
  branch: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  expiryDate: { type: Date, required: true },
  receivedCost: { type: Number, min: 0 }
}, { timestamps: true });

const ingredientSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    required: true,
    enum: [
      'Produce & Greens',
      'Dairy & Cheese',
      'Meat & Poultry',
      'Seafood',
      'Pantry & Grains',
      'Spices & Condiments',
      'Beverages & Syrups',
      'Bakery & Pastry'
    ]
  },
  baseUnit: {
    type: String,
    required: true,
    enum: ['kg', 'g', 'L', 'ml', 'pcs', 'can', 'box']
  },
  unitCost: { type: Number, required: true, min: 0 },
  minThreshold: { type: Number, required: true, min: 0 },
  maxThreshold: { type: Number, min: 0 },
  reorderLevel: { type: Number, min: 0 },
  primarySupplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  stockByBranch: {
    type: Map,
    of: Number,
    default: {}
  },
  batches: [batchSchema]
}, { timestamps: true });

module.exports = mongoose.model('Ingredient', ingredientSchema);
