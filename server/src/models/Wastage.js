const mongoose = require('mongoose');

const wastageSchema = new mongoose.Schema({
  wasteNumber: { type: String, required: true, unique: true, uppercase: true },
  branch: { type: String, required: true, index: true },
  branchRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true, index: true },
  batchNumber: { type: String, default: 'GENERAL-STOCK' },
  quantity: { type: Number, required: true, min: 0.01 },
  unit: { type: String, required: true },
  unitCost: { type: Number, required: true, min: 0 },
  totalCost: { type: Number, required: true, min: 0 },
  reason: {
    type: String,
    required: true,
    enum: ['EXPIRED', 'SPOILED', 'PREP_LOSS', 'HANDLING_DAMAGE']
  },
  loggedBy: { type: String, required: true },
  loggedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, default: Date.now, index: true },
  notes: { type: String }
}, { timestamps: true });

wastageSchema.index({ branch: 1, date: -1 });

module.exports = mongoose.model('Wastage', wastageSchema);
