// server/controllers/complaintController.js  (Member 4, Module 6)
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const gateway = require('../services/orderGateway');
const { audit } = require('../utils/audit');

const ok = (res, data, message = 'OK', code = 200) => res.status(code).json({ success: true, data, message });
const fail = (res, code, message) => res.status(code).json({ success: false, message });

const handleError = (err, res, next) => {
  if (err.name === 'ValidationError') return fail(res, 400, Object.values(err.errors).map((e) => e.message).join(', '));
  if (err.name === 'CastError') return fail(res, 400, 'Invalid value or id');
  next(err);
};

const MAX_OPEN_PER_CUSTOMER = 5;
const CLOSED = ['resolved', 'rejected'];
// Allowed status changes. Closed complaints cannot be changed.
const TRANSITIONS = { open: ['in_review', 'resolved', 'rejected'], in_review: ['resolved', 'rejected'] };

// ---------- Customer ----------

// POST /api/complaints   body: { subject, description?, category?, order? }
exports.create = async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!String(b.subject || '').trim()) return fail(res, 400, 'Please add a subject');

    const CATEGORY_MAP = {
      food_quality: 'food',
      late_delivery: 'delivery',
      wrong_item: 'delivery',
      staff_behavior: 'service',
    };
    let category = b.category;
    if (category && CATEGORY_MAP[category]) {
      category = CATEGORY_MAP[category];
    }
    if (category !== undefined && !Complaint.CATEGORIES.includes(category)) return fail(res, 400, 'Invalid category');

    const openCount = await Complaint.countDocuments({ customer: req.user.id, status: { $in: ['open', 'in_review'] } });
    if (openCount >= MAX_OPEN_PER_CUSTOMER) {
      return fail(res, 409, `You already have ${MAX_OPEN_PER_CUSTOMER} complaints being handled. Please wait for a reply first.`);
    }

    let order = null;
    const orderId = b.order || b.orderId;
    if (orderId) {
      if (!mongoose.isValidObjectId(orderId)) return fail(res, 400, 'Invalid order id');
      order = await gateway.findCustomerOrder(orderId, req.user.id);
      if (!order) return fail(res, 404, 'Order not found');
    }

    const complaint = await Complaint.create({
      customer: req.user.id,
      order: order?._id, orderNumber: order?.orderNumber, branch: order?.branch,
      category: category || 'other', subject: b.subject, description: b.description,
      history: [{ status: 'open', at: new Date(), by: req.user.id }],
    });
    ok(res, complaint, 'Complaint sent. We will reply as soon as we can.', 201);
  } catch (err) { handleError(err, res, next); }
};

// GET /api/complaints/mine
exports.mine = async (req, res, next) => {
  try {
    ok(res, await Complaint.find({ customer: req.user.id })
      .select('-customer -history -respondedBy').sort({ createdAt: -1 }).limit(100));
  } catch (err) { handleError(err, res, next); }
};

// ---------- Staff ----------

// GET /api/complaints?status=&page=&limit=
exports.list = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) {
      if (!Complaint.STATUSES.includes(req.query.status)) return fail(res, 400, 'Invalid status');
      filter.status = req.query.status;
    }
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 100);
    const [items, total, grouped] = await Promise.all([
      Complaint.find(filter).select('-history').populate('customer', 'name')
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Complaint.countDocuments(filter),
      Complaint.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);
    ok(res, { items, total, page, pages: Math.ceil(total / limit), counts: Object.fromEntries(grouped.map((g) => [g._id, g.n])) });
  } catch (err) { handleError(err, res, next); }
};

// PATCH /api/complaints/:id   body: { status?, response? }
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return fail(res, 400, 'Invalid id');
    const c = await Complaint.findById(id);
    if (!c) return fail(res, 404, 'Complaint not found');
    if (CLOSED.includes(c.status)) return fail(res, 409, 'This complaint is already closed');

    const b = req.body || {};
    let next_ = c.status;
    if (b.status !== undefined && b.status !== c.status) {
      if (!(TRANSITIONS[c.status] || []).includes(b.status)) return fail(res, 409, 'That status change is not allowed');
      next_ = b.status;
    }
    const response = b.response !== undefined ? String(b.response).trim().slice(0, 1000) : c.response;
    if (CLOSED.includes(next_) && !response) return fail(res, 400, 'Write a response before closing this complaint');

    const set = { status: next_, response, respondedBy: req.user.id, respondedAt: new Date() };
    const update = { $set: set };
    if (next_ !== c.status) update.$push = { history: { status: next_, at: new Date(), by: req.user.id } };

    // Atomic: only applies if nobody changed the status since we read it.
    const updated = await Complaint.findOneAndUpdate({ _id: id, status: c.status }, update, { new: true })
      .select('-history').populate('customer', 'name');
    if (!updated) return fail(res, 409, 'This complaint was just updated. Refresh and try again.');

    await audit(req, 'complaint.update', updated._id, { status: next_ });
    ok(res, updated, 'Complaint updated');
  } catch (err) { handleError(err, res, next); }
};
