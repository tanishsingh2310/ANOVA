// server/controllers/deliveryController.js  (Member 4, Module 3)
const mongoose = require('mongoose');
const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const { ACTIVE, RIDER_NEXT, createDelivery, listDeliveryStaff } = require('../services/deliveryService');
const { simulatedState } = require('../services/trackingService');
const { audit } = require('../utils/audit');

const ok = (res, data, message = 'OK', code = 200) =>
  res.status(code).json({ success: true, data, message });
const fail = (res, code, message) => res.status(code).json({ success: false, message });

const handleError = (err, res, next) => {
  if (err.name === 'ValidationError') {
    return fail(res, 400, Object.values(err.errors).map((e) => e.message).join(', '));
  }
  if (err.name === 'CastError') return fail(res, 400, 'Invalid value or id');
  if (err.code === 11000) return fail(res, 409, 'A delivery already exists for this order');
  next(err);
};

const validId = (id) => mongoose.isValidObjectId(id);
// Fields a rider may see: what is needed to do the job, nothing more.
const RIDER_FIELDS = 'orderNumber status pickup dropoff customerName customerPhone itemCount assignedAt deliveredAt createdAt';

// ---------- Staff (owner, admin, manager) ----------

// GET /api/deliveries?status=&page=&limit=
exports.listDeliveries = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) {
      if (!Delivery.STATUSES.includes(req.query.status)) return fail(res, 400, 'Invalid status');
      filter.status = req.query.status;
    }
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const [items, total, grouped] = await Promise.all([
      Delivery.find(filter).select('-customerUser -timeline').populate('deliveryStaff', 'name')
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Delivery.countDocuments(filter),
      Delivery.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);
    const counts = Object.fromEntries(grouped.map((g) => [g._id, g.n]));
    ok(res, { items, total, page, pages: Math.ceil(total / limit), counts });
  } catch (err) { handleError(err, res, next); }
};

// GET /api/deliveries/staff   assignable delivery staff with their current workload
exports.listStaff = async (req, res, next) => {
  try {
    const staff = await listDeliveryStaff(mongoose.model('User'));
    const load = await Delivery.aggregate([
      { $match: { status: { $in: ['assigned', 'picked_up', 'on_the_way'] }, deliveryStaff: { $ne: null } } },
      { $group: { _id: '$deliveryStaff', n: { $sum: 1 } } },
    ]);
    const byId = Object.fromEntries(load.map((l) => [String(l._id), l.n]));
    ok(res, staff.map((s) => ({ _id: s._id, name: s.name, activeCount: byId[String(s._id)] || 0 })));
  } catch (err) { handleError(err, res, next); }
};

// POST /api/deliveries   manual creation (testing, or an order Member 3 has not wired up yet)
exports.createDelivery = async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!validId(b.order)) return fail(res, 400, 'A valid order id is required');

    // Verify order exists, is of Delivery type, and is not already delivered/cancelled
    const order = await Order.findById(b.order);
    if (!order) return fail(res, 404, 'Order not found');

    if (String(order.orderType).toLowerCase() !== 'delivery') {
      return fail(res, 400, `Cannot create delivery for order with type "${order.orderType}". Must be "Delivery".`);
    }

    const completedOrCancelled = ['delivered', 'completed', 'cancelled'];
    if (completedOrCancelled.includes(String(order.status).toLowerCase())) {
      return fail(res, 400, `Cannot create delivery for order with status "${order.status}". Order must be pending, preparing, or ready.`);
    }

    const d = await createDelivery({
      orderId: order._id,
      orderNumber: b.orderNumber || order.orderNumber,
      branchId: validId(b.branch) ? b.branch : (order.branch || order.branchId),
      pickup: b.pickup,
      dropoff: b.dropoff,
      customerUser: validId(b.customerUser) ? b.customerUser : (validId(order.customer) ? order.customer : undefined),
      customerName: b.customerName || order.customerName,
      customerPhone: b.customerPhone,
      itemCount: b.itemCount || (Array.isArray(order.items) ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0),
    });
    ok(res, d, 'Delivery created', 201);
  } catch (err) { handleError(err, res, next); }
};

// PATCH /api/deliveries/:id/assign   body: { staffId }   (assign or reassign)
exports.assign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const staffId = req.body?.staffId;
    if (!validId(id) || !validId(staffId)) return fail(res, 400, 'Invalid id');

    const staff = await mongoose.model('User').findOne({
      _id: staffId,
      role: { $in: ['delivery', 'delivery_personnel'] },
    }).select('name');
    if (!staff) return fail(res, 400, 'Choose a valid delivery staff member');

    // Atomic: only a waiting or just-assigned delivery can be (re)assigned.
    const d = await Delivery.findOneAndUpdate(
      { _id: id, status: { $in: ['pending', 'assigned'] } },
      {
        $set: { deliveryStaff: staff._id, status: 'assigned', assignedAt: new Date() },
        $push: { timeline: { status: 'assigned', at: new Date(), by: req.user.id } },
      },
      { new: true }
    ).select('-customerUser').populate('deliveryStaff', 'name');

    if (!d) {
      return (await Delivery.exists({ _id: id }))
        ? fail(res, 409, 'This delivery can no longer be assigned')
        : fail(res, 404, 'Delivery not found');
    }
    await audit(req, 'delivery.assign', d._id, { staff: String(staff._id) });
    ok(res, d, 'Delivery assigned');
  } catch (err) { handleError(err, res, next); }
};

// ---------- Rider (delivery) ----------

// GET /api/deliveries/mine?history=true
exports.mine = async (req, res, next) => {
  try {
    const history = req.query.history === 'true';
    const filter = { deliveryStaff: req.user.id, status: history ? { $in: ['delivered', 'cancelled'] } : { $in: ['assigned', 'picked_up', 'on_the_way'] } };
    const items = await Delivery.find(filter).select(RIDER_FIELDS)
      .sort(history ? { updatedAt: -1 } : { assignedAt: 1 }).limit(history ? 50 : 100);
    ok(res, items);
  } catch (err) { handleError(err, res, next); }
};

// PATCH /api/deliveries/:id/status   body: { status, reason? }
//   rider: only the next step, only on their own delivery
//   staff: only "cancelled"
exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const requested = req.body?.status;
    if (!validId(id)) return fail(res, 400, 'Invalid id');

    const isRider = req.user.role === 'delivery' || req.user.role === 'delivery_personnel';
    const scope = isRider ? { _id: id, deliveryStaff: req.user.id } : { _id: id };
    const current = await Delivery.findOne(scope).select('status');
    if (!current) return fail(res, 404, 'Delivery not found'); // also hides other riders' deliveries

    const set = { status: requested };
    if (isRider) {
      if (RIDER_NEXT[current.status] !== requested) return fail(res, 409, 'That step is not allowed right now');
      if (requested === 'delivered') set.deliveredAt = new Date();
    } else {
      if (requested !== 'cancelled' || !ACTIVE.includes(current.status)) {
        return fail(res, 409, 'Only an unfinished delivery can be cancelled');
      }
      set.cancelledReason = String(req.body?.reason || '').slice(0, 200) || undefined;
    }

    // Atomic: only applies if the status is still what we just read (stops double clicks and races).
    let q = Delivery.findOneAndUpdate(
      { ...scope, status: current.status },
      { $set: set, $push: { timeline: { status: requested, at: new Date(), by: req.user.id } } },
      { new: true }
    ).select(isRider ? RIDER_FIELDS : '-customerUser');
    if (!isRider) q = q.populate('deliveryStaff', 'name');
    const d = await q;
    if (!d) return fail(res, 409, 'This delivery was just updated. Refresh and try again.');

    if (!isRider) await audit(req, 'delivery.cancel', d._id, { reason: set.cancelledReason });
    ok(res, d, 'Status updated');
  } catch (err) { handleError(err, res, next); }
};

// ---------- Customer ----------

// GET /api/deliveries/track/:orderId   own delivery only, limited fields
// Position is SIMULATED (see services/trackingService.js). The shape is what real GPS would return too.
exports.track = async (req, res, next) => {
  try {
    if (!validId(req.params.orderId)) return fail(res, 400, 'Invalid id');
    const d = await Delivery.findOne({ order: req.params.orderId, customerUser: req.user.id })
      .select('order status assignedAt deliveredAt deliveryStaff timeline pickup.name pickup.location dropoff.location')
      .populate('deliveryStaff', 'name');
    if (!d) return fail(res, 404, 'No delivery for this order yet');

    const riderName = d.deliveryStaff?.name ? String(d.deliveryStaff.name).split(' ')[0] : undefined; // first name only
    const sim = simulatedState(d);
    const showMap = ['assigned', 'picked_up', 'on_the_way', 'delivered'].includes(d.status);
    ok(res, {
      status: d.status,
      riderName,
      assignedAt: d.assignedAt,
      deliveredAt: d.deliveredAt,
      pickup: { name: d.pickup?.name, location: sim.pickup },
      dropoff: { location: sim.dropoff },
      route: showMap ? sim.route : [],
      position: sim.position,
      progress: sim.progress,
      etaSeconds: sim.etaSeconds,
      isSimulated: true,
    });
  } catch (err) { handleError(err, res, next); }
};

// ---------- Shared ----------

// GET /api/deliveries/:id   staff: any delivery. rider: only their own.
exports.getOne = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Invalid id');
    const isRider = ['delivery', 'delivery_personnel'].includes(
      req.user.role
    );
    const scope = isRider ? { _id: req.params.id, deliveryStaff: req.user.id } : { _id: req.params.id };
    let q = Delivery.findOne(scope).select(isRider ? RIDER_FIELDS : '-customerUser');
    if (!isRider) q = q.populate('deliveryStaff', 'name');
    const d = await q;
    if (!d) return fail(res, 404, 'Delivery not found');
    ok(res, d);
  } catch (err) { handleError(err, res, next); }
};
