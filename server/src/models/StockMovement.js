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
  reference: { type: String, required: true },
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  branch: { type: String, required: true },
  deltaQty: { type: Number, required: true },
  unit: { type: String, required: true },
  resultingBalance: { type: Number, required: true },
  performedBy: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
