const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'GOODS_RECEIPT',
      'TRANSFER_DISPATCH',
      'TRANSFER_RECEIVE',
      'STOCK_ADJUSTMENT',
      'WASTAGE_DEDUCTION',
      'RECIPE_CONSUMPTION'
    ]
  },
  reference: { type: String, required: true, index: true },
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true, index: true },
  branch: { type: String, required: true, index: true },
  branchRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
  deltaQty: { type: Number, required: true },
  unit: { type: String, required: true },
  resultingBalance: { type: Number, required: true },
  performedBy: { type: String, required: true },
  performedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now, index: true },
  notes: { type: String }
}, { timestamps: true });

stockMovementSchema.index({ branch: 1, timestamp: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
