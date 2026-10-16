const mongoose = require('mongoose');

const poLineItemSchema = new mongoose.Schema({
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  orderedQty: { type: Number, required: true, min: 0.01 },
  unit: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  receivedQty: { type: Number, default: 0, min: 0 },
  rejectedQty: { type: Number, default: 0, min: 0 },
  damagedQty: { type: Number, default: 0, min: 0 }
});

const receiptItemSchema = new mongoose.Schema({
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  acceptedQty: { type: Number, required: true, min: 0 },
  rejectedQty: { type: Number, default: 0, min: 0 },
  damagedQty: { type: Number, default: 0, min: 0 },
  batchNumber: { type: String, required: true },
  expiryDate: { type: Date, required: true }
});

const receiptRecordSchema = new mongoose.Schema({
  grnNumber: { type: String, required: true },
  receivedAt: { type: Date, default: Date.now },
  receivedBy: { type: String, required: true },
  notes: { type: String },
  items: [receiptItemSchema]
});

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: { type: String, required: true, unique: true, uppercase: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  branch: { type: String, required: true },
  status: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
    default: 'DRAFT'
  },
  expectedDeliveryDate: { type: Date },
  approvedBy: { type: String },
  approvedAt: { type: Date },
  items: [poLineItemSchema],
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  receiptHistory: [receiptRecordSchema]
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
