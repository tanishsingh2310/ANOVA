// server/models/Complaint.js  (Member 4, Module 6)
const mongoose = require('mongoose');

const STATUSES = ['open', 'in_review', 'resolved', 'rejected'];
const CATEGORIES = ['food', 'delivery', 'service', 'billing', 'other'];

const complaintSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // optional: a complaint can be general
  orderNumber: String,
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  category: { type: String, enum: CATEGORIES, default: 'other' },
  subject: { type: String, required: [true, 'Please add a subject'], trim: true, maxlength: [100, 'Subject can be up to 100 characters'] },
  description: { type: String, trim: true, maxlength: [1000, 'Description can be up to 1000 characters'] },
  status: { type: String, enum: STATUSES, default: 'open' },
  response: { type: String, trim: true, maxlength: 1000 },
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  respondedAt: Date,
  history: [{
    status: { type: String, enum: STATUSES },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    _id: false,
  }],
}, { timestamps: true });

complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
module.exports.STATUSES = STATUSES;
module.exports.CATEGORIES = CATEGORIES;
