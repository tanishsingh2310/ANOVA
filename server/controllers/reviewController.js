// server/controllers/reviewController.js  (Member 4, Module 6)
const mongoose = require('mongoose');
const Review = require('../models/Review');
const gateway = require('../services/orderGateway'); // used as gateway.fn() so it can be swapped in tests
const { audit } = require('../utils/audit');

const ok = (res, data, message = 'OK', code = 200) => res.status(code).json({ success: true, data, message });
const fail = (res, code, message) => res.status(code).json({ success: false, message });

const handleError = (err, res, next) => {
  if (err.name === 'ValidationError') return fail(res, 400, Object.values(err.errors).map((e) => e.message).join(', '));
  if (err.name === 'CastError') return fail(res, 400, 'Invalid value or id');
  if (err.code === 11000) return fail(res, 409, 'You have already reviewed this order');
  next(err);
};

const wholeRating = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
};

// ---------- Customer ----------

// POST /api/reviews   body: { order, foodRating, deliveryRating?, comment? }
exports.createReview = async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!mongoose.isValidObjectId(b.order)) return fail(res, 400, 'Choose an order to review');
    const food = wholeRating(b.foodRating);
    if (food === null) return fail(res, 400, 'Give the food a rating from 1 to 5');

    const hasDelivery = b.deliveryRating !== undefined && b.deliveryRating !== null && b.deliveryRating !== '';
    const delivery = hasDelivery ? wholeRating(b.deliveryRating) : undefined;
    if (hasDelivery && delivery === null) return fail(res, 400, 'Give the delivery a rating from 1 to 5');

    // Ownership and status are checked on the server, never taken from the request.
    const order = await gateway.findCustomerOrder(b.order, req.user.id);
    if (!order) return fail(res, 404, 'Order not found');
    if (!gateway.isCompleted(order)) return fail(res, 409, 'You can review an order after it is delivered or collected');
    if (hasDelivery && order.orderType !== 'delivery') return fail(res, 400, 'Delivery ratings only apply to delivery orders');

    const review = await Review.create({
      customer: req.user.id, order: order._id, orderNumber: order.orderNumber, branch: order.branch,
      orderType: order.orderType, foodRating: food, deliveryRating: delivery, comment: b.comment,
    });
    ok(res, review, 'Thank you for your review', 201);
  } catch (err) { handleError(err, res, next); }
};

// GET /api/reviews/mine
exports.mine = async (req, res, next) => {
  try {
    ok(res, await Review.find({ customer: req.user.id }).select('-customer').sort({ createdAt: -1 }).limit(100));
  } catch (err) { handleError(err, res, next); }
};

// GET /api/reviews/summary   average food rating per branch (hidden reviews excluded)
exports.summary = async (req, res, next) => {
  try {
    const rows = await Review.aggregate([
      { $match: { isHidden: false, branch: { $ne: null } } },
      { $group: { _id: '$branch', average: { $avg: '$foodRating' }, count: { $sum: 1 } } },
    ]);
    ok(res, rows.map((r) => ({ branch: r._id, average: Math.round(r.average * 10) / 10, count: r.count })));
  } catch (err) { handleError(err, res, next); }
};

// ---------- Staff ----------

// GET /api/reviews?branch=&low=true&hidden=true&page=&limit=
exports.list = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.branch) {
      if (!mongoose.isValidObjectId(req.query.branch)) return fail(res, 400, 'Invalid branch id');
      filter.branch = req.query.branch;
    }
    if (req.query.low === 'true') filter.foodRating = { $lte: 2 };
    if (req.query.hidden === 'true') filter.isHidden = true;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 100);
    const [items, total] = await Promise.all([
      Review.find(filter).populate('customer', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Review.countDocuments(filter),
    ]);
    ok(res, { items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { handleError(err, res, next); }
};

// PATCH /api/reviews/:id   body: { isHidden?, reply? }   (reply: "" removes it)
exports.moderate = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid id');
    const review = await Review.findById(req.params.id);
    if (!review) return fail(res, 404, 'Review not found');

    const b = req.body || {};
    if (typeof b.isHidden === 'boolean') review.isHidden = b.isHidden;
    if (b.reply !== undefined) {
      const text = String(b.reply).trim();
      review.reply = text ? { text, by: req.user.id, at: new Date() } : undefined;
    }
    await review.save();
    await audit(req, 'review.moderate', review._id, { isHidden: review.isHidden });
    ok(res, review, 'Review updated');
  } catch (err) { handleError(err, res, next); }
};
