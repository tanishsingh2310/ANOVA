// server/controllers/couponController.js  (Member 4, Module 5)
const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');
const { evaluateCoupon } = require('../services/couponService');
const { audit } = require('../utils/audit');

const ok = (res, data, message = 'OK', code = 200) =>
  res.status(code).json({ success: true, data, message });
const fail = (res, code, message) => res.status(code).json({ success: false, message });

const handleError = (err, res, next) => {
  if (err.name === 'ValidationError') {
    return fail(res, 400, Object.values(err.errors).map((e) => e.message).join(', '));
  }
  if (err.name === 'CastError') return fail(res, 400, 'Invalid value or id');
  if (err.code === 11000) return fail(res, 409, 'That coupon code already exists');
  next(err);
};

const pick = (obj = {}, keys) =>
  Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

const WRITABLE = ['title', 'description', 'campaign', 'discountType', 'discountValue', 'minOrderAmount',
  'maxDiscount', 'validFrom', 'validTo', 'usageLimit', 'perCustomerLimit', 'branches', 'isPublic', 'isActive'];

// ---------- Customer ----------

// POST /api/coupons/validate   body: { code, branch, subtotal }
// PREVIEW ONLY. The order itself recalculates the discount on the server.
exports.validate = async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!mongoose.isValidObjectId(b.branch)) return fail(res, 400, 'Choose a branch first');
    const subtotal = Number(b.subtotal);
    if (!(subtotal > 0)) return fail(res, 400, 'Invalid order amount');

    const r = await evaluateCoupon({ code: b.code, branchId: b.branch, subtotal, userId: req.user.id });
    if (!r.ok) return fail(res, 400, r.message);
    ok(res, { code: r.coupon.code, title: r.coupon.title, discount: r.discount }, 'Offer applied');
  } catch (err) { handleError(err, res, next); }
};

// GET /api/coupons/offers?branch=<id>   public offers that can be used right now
exports.listOffers = async (req, res, next) => {
  try {
    const now = new Date();
    const filter = {
      isActive: true,
      isPublic: true,
      $and: [
        { $or: [{ validFrom: null }, { validFrom: { $lte: now } }] },
        { $or: [{ validTo: null }, { validTo: { $gte: now } }] },
      ],
    };
    if (req.query.branch) {
      if (!mongoose.isValidObjectId(req.query.branch)) return fail(res, 400, 'Invalid branch id');
      filter.$and.push({ $or: [{ branches: { $size: 0 } }, { branches: req.query.branch }] });
    }
    const offers = await Coupon.find(filter)
      .select('code title description discountType discountValue minOrderAmount maxDiscount validTo branches usageLimit usedCount')
      .sort({ createdAt: -1 })
      .lean();
    ok(res, offers.filter((o) => !o.usageLimit || o.usedCount < o.usageLimit)
      .map(({ usageLimit, usedCount, ...rest }) => rest));
  } catch (err) { handleError(err, res, next); }
};

// ---------- Staff ----------

// GET /api/coupons?page=&limit=
exports.listCoupons = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const [items, total] = await Promise.all([
      Coupon.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Coupon.countDocuments(),
    ]);
    ok(res, { items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { handleError(err, res, next); }
};

// POST /api/coupons
exports.createCoupon = async (req, res, next) => {
  try {
    const data = pick(req.body, ['code', ...WRITABLE]);
    const coupon = await Coupon.create({ ...data, createdBy: req.user.id });
    await audit(req, 'coupon.create', coupon._id, { code: coupon.code });
    ok(res, coupon, 'Coupon created', 201);
  } catch (err) { handleError(err, res, next); }
};

// PUT /api/coupons/:id   (code and usedCount cannot be changed)
exports.updateCoupon = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid id');
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return fail(res, 404, 'Coupon not found');
    coupon.set(pick(req.body, WRITABLE));
    await coupon.save(); // save() runs the validators
    await audit(req, 'coupon.update', coupon._id, { code: coupon.code });
    ok(res, coupon, 'Coupon updated');
  } catch (err) { handleError(err, res, next); }
};

// DELETE /api/coupons/:id   only when never used; otherwise deactivate it instead
exports.deleteCoupon = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid id');
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return fail(res, 404, 'Coupon not found');
    if (coupon.usedCount > 0) return fail(res, 409, 'This coupon has been used. Deactivate it instead.');
    await coupon.deleteOne();
    await audit(req, 'coupon.delete', coupon._id, { code: coupon.code });
    ok(res, null, 'Coupon deleted');
  } catch (err) { handleError(err, res, next); }
};
