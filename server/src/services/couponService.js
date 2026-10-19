// server/services/couponService.js  (Member 4, Module 5)
// The ONE place coupon rules live. The preview endpoint (POST /api/coupons/validate)
// and Member 3's order creation must both call evaluateCoupon, so the discount a
// customer sees is the discount the order gets. Never trust a discount from the client.
const Coupon = require('../models/Coupon');
const CouponRedemption = require('../models/CouponRedemption');

const round2 = (n) => Math.round(n * 100) / 100;
const normalizeCode = (c) => String(c || '').trim().toUpperCase();

// Pure function: how much money this coupon takes off this subtotal.
function calcDiscount(coupon, subtotal) {
  let d = coupon.discountType === 'percent' ? (subtotal * coupon.discountValue) / 100 : coupon.discountValue;
  if (coupon.discountType === 'percent' && coupon.maxDiscount) d = Math.min(d, coupon.maxDiscount);
  return round2(Math.max(0, Math.min(d, subtotal))); // never more than the subtotal
}

// Pure function (no database): decides if a coupon can be used right now.
function checkCoupon(coupon, { branchId, subtotal, customerUses = 0, now = new Date() }) {
  if (!coupon || !coupon.isActive) return { ok: false, message: 'This code is not valid' };
  if (coupon.validFrom && now < coupon.validFrom) return { ok: false, message: 'This offer has not started yet' };
  if (coupon.validTo && now > coupon.validTo) return { ok: false, message: 'This offer has expired' };
  if (coupon.branches?.length && !coupon.branches.some((b) => String(b) === String(branchId))) {
    return { ok: false, message: 'This offer is not available at the selected branch' };
  }
  if (subtotal < (coupon.minOrderAmount || 0)) {
    return { ok: false, message: `Spend at least ${coupon.minOrderAmount} to use this code` };
  }
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, message: 'This offer has been fully claimed' };
  }
  if (customerUses >= (coupon.perCustomerLimit || 1)) {
    return { ok: false, message: 'You have already used this code' };
  }
  return { ok: true, discount: calcDiscount(coupon, subtotal) };
}

// For Member 3's order creation: call this with the SERVER-side subtotal.
// Returns { ok, message?, discount?, coupon? }. userId is the logged-in user's id.
async function evaluateCoupon({ code, branchId, subtotal, userId, now = new Date() }) {
  const normalized = normalizeCode(code);
  if (!normalized) return { ok: false, message: 'Enter an offer code' };
  const coupon = await Coupon.findOne({ code: normalized });
  const customerUses = coupon && userId
    ? await CouponRedemption.countDocuments({ coupon: coupon._id, customer: userId })
    : 0;
  const result = checkCoupon(coupon, { branchId, subtotal, customerUses, now });
  return result.ok ? { ...result, coupon } : result;
}

const fail = (status, message) => Object.assign(new Error(message), { statusCode: status });

// For Member 3: call AFTER the order is saved, with the discount that order received.
// Throws (409) if the coupon ran out in the meantime, so the caller can cancel the order.
async function redeemCoupon({ couponId, userId, orderId, amount }) {
  // 1. Atomic total-limit check: only counts up while there is room.
  const updated = await Coupon.findOneAndUpdate(
    { _id: couponId, isActive: true, $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] },
    { $inc: { usedCount: 1 } },
    { new: true }
  );
  if (!updated) throw fail(409, 'This offer has been fully claimed');

  const rollbackCount = () => Coupon.updateOne({ _id: couponId }, { $inc: { usedCount: -1 } });

  // 2. Record the use.
  let redemption;
  try {
    redemption = await CouponRedemption.create({ coupon: couponId, customer: userId, order: orderId, amount });
  } catch (err) {
    await rollbackCount();
    throw err;
  }

  // 3. Per-customer limit: insert first, then verify, so two parallel orders cannot both slip through.
  const uses = await CouponRedemption.countDocuments({ coupon: couponId, customer: userId });
  if (uses > (updated.perCustomerLimit || 1)) {
    await CouponRedemption.deleteOne({ _id: redemption._id });
    await rollbackCount();
    throw fail(409, 'You have already used this code');
  }
  return redemption;
}

module.exports = { normalizeCode, calcDiscount, checkCoupon, evaluateCoupon, redeemCoupon };
