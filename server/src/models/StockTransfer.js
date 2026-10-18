const mongoose = require('mongoose');

const transferItemSchema = new mongoose.Schema({
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  qty: { type: Number, required: true, min: 0.01 },
  unit: { type: String, required: true },
  unitCost: { type: Number, min: 0 },
  batchNumber: { type: String }
});

const stockTransferSchema = new mongoose.Schema({
  transferNumber: { type: String, required: true, unique: true, uppercase: true },
  fromBranch: { type: String, required: true, index: true },
  toBranch: { type: String, required: true, index: true },
  fromBranchRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
  toBranchRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
  status: {
    type: String,
    enum: ['DRAFT', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'],
    default: 'IN_TRANSIT',
    index: true
  },
  dispatchedAt: { type: Date, default: Date.now },
  dispatchedBy: { type: String, required: true },
  dispatchedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receivedAt: { type: Date },
  receivedBy: { type: String },
  receivedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [transferItemSchema],
  notes: { type: String }
}, { timestamps: true });

stockTransferSchema.index({ fromBranch: 1, toBranch: 1, status: 1 });

module.exports = mongoose.model('StockTransfer', stockTransferSchema);
