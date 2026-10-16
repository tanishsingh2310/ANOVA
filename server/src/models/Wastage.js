const mongoose = require('mongoose');

const wastageSchema = new mongoose.Schema({
  wasteNumber: { type: String, required: true, unique: true, uppercase: true },
  branch: { type: String, required: true },
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
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
  date: { type: Date, default: Date.now },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Wastage', wastageSchema);
