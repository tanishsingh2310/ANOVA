const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batchNumber: { type: String, required: true },
  branch: { type: String, required: true, index: true },
  branchRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  quantity: { type: Number, required: true, min: 0 },
  expiryDate: { type: Date, required: true, index: true },
  receivedCost: { type: Number, min: 0 }
}, { timestamps: true });

const ingredientSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true, index: true },
  category: {
    type: String,
    required: true,
    index: true,
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

  // Cross-Module Reference: Link to Supplier
  primarySupplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', index: true },

  // Branch Stock Balances: Maps branch identifier (ObjectId string or code) to available quantity
  stockByBranch: {
    type: Map,
    of: Number,
    default: {}
  },

  // Traceable inventory batches for FIFO valuation & expiry tracking
  batches: [batchSchema]
}, {
  timestamps: true,
  toJSON: { flattenMaps: true },
  toObject: { flattenMaps: true }
});

// Safe branch stock accessors
ingredientSchema.methods.getStock = function(branchId) {
  if (!branchId || branchId === 'all') {
    let total = 0;
    if (this.stockByBranch instanceof Map) {
      for (const val of this.stockByBranch.values()) {
        total += Number(val || 0);
      }
    } else if (typeof this.stockByBranch === 'object' && this.stockByBranch !== null) {
      for (const val of Object.values(this.stockByBranch)) {
        total += Number(val || 0);
      }
    }
    return total;
  }
  if (this.stockByBranch instanceof Map) {
    return Number(this.stockByBranch.get(String(branchId)) || 0);
  }
  return Number(this.stockByBranch?.[String(branchId)] || 0);
};

ingredientSchema.methods.setStock = function(branchId, qty) {
  if (this.stockByBranch instanceof Map) {
    this.stockByBranch.set(String(branchId), Math.max(0, Number(qty)));
  } else if (typeof this.stockByBranch === 'object' && this.stockByBranch !== null) {
    this.stockByBranch[String(branchId)] = Math.max(0, Number(qty));
  }
};

module.exports = mongoose.model('Ingredient', ingredientSchema);
