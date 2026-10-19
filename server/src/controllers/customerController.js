// server/controllers/customerController.js  (Member 4, Module 1)
const mongoose = require('mongoose');
const Customer = require('../models/Customer');

const ok = (res, data, message = 'OK', code = 200) =>
  res.status(code).json({ success: true, data, message });

const fail = (res, code, message) => res.status(code).json({ success: false, message });

// Turns Mongoose validation / bad-id errors into 400 responses, passes the rest on.
const handleError = (err, res, next) => {
  if (err.name === 'ValidationError') {
    return fail(res, 400, Object.values(err.errors).map((e) => e.message).join(', '));
  }
  if (err.name === 'CastError') return fail(res, 400, 'Invalid id');
  next(err);
};

// Always scoped to the logged-in user (req.user.id comes from the verified token).
// Upsert is atomic, so two quick requests cannot create two profiles.
const getOrCreate = (userId) =>
  Customer.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { loyaltyPoints: 0 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

const clearDefaults = (customer, exceptId) => {
  customer.addresses.forEach((a) => {
    if (String(a._id) !== String(exceptId)) a.isDefault = false;
  });
};

// Whitelists: only these fields can be written by the client.
const ADDRESS_FIELDS = ['label', 'line1', 'city', 'postalCode', 'location', 'isDefault'];
const pick = (obj = {}, keys) =>
  Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

// ---------- Customer self-service (role: customer) ----------

// GET /api/customers/me
exports.getMe = async (req, res, next) => {
  try {
    const customer = await getOrCreate(req.user.id);
    await customer.populate('user', 'name email');
    ok(res, customer);
  } catch (err) { handleError(err, res, next); }
};

// PUT /api/customers/me   body: { phone?, preferences?: { dietary?: string[], favouriteBranch?: id|null } }
exports.updateMe = async (req, res, next) => {
  try {
    const body = req.body || {};
    const customer = await getOrCreate(req.user.id);

    if (body.phone !== undefined) customer.phone = body.phone || undefined;

    const prefs = body.preferences || {};
    if (prefs.dietary !== undefined) {
      if (!Array.isArray(prefs.dietary) || prefs.dietary.length > 10) {
        return fail(res, 400, 'dietary must be a list of up to 10 items');
      }
      customer.preferences.dietary = prefs.dietary.map((d) => String(d).slice(0, 30));
    }
    if (prefs.favouriteBranch !== undefined) {
      if (prefs.favouriteBranch !== null && !mongoose.isValidObjectId(prefs.favouriteBranch)) {
        return fail(res, 400, 'Invalid branch id');
      }
      customer.preferences.favouriteBranch = prefs.favouriteBranch || undefined;
    }

    await customer.save();
    ok(res, customer, 'Profile updated');
  } catch (err) { handleError(err, res, next); }
};

// POST /api/customers/me/addresses
exports.addAddress = async (req, res, next) => {
  try {
    const customer = await getOrCreate(req.user.id);
    const data = pick(req.body, ADDRESS_FIELDS);
    if (customer.addresses.length === 0) data.isDefault = true; // first one is default
    customer.addresses.push(data);
    const added = customer.addresses[customer.addresses.length - 1];
    if (added.isDefault) clearDefaults(customer, added._id);
    await customer.save();
    ok(res, customer.addresses, 'Address added', 201);
  } catch (err) { handleError(err, res, next); }
};

// PUT /api/customers/me/addresses/:addressId
exports.updateAddress = async (req, res, next) => {
  try {
    const customer = await getOrCreate(req.user.id);
    const addr = customer.addresses.id(req.params.addressId);
    if (!addr) return fail(res, 404, 'Address not found');
    addr.set(pick(req.body, ADDRESS_FIELDS));
    if (addr.isDefault) clearDefaults(customer, addr._id);
    await customer.save();
    ok(res, customer.addresses, 'Address updated');
  } catch (err) { handleError(err, res, next); }
};

// DELETE /api/customers/me/addresses/:addressId
exports.deleteAddress = async (req, res, next) => {
  try {
    const customer = await getOrCreate(req.user.id);
    const addr = customer.addresses.id(req.params.addressId);
    if (!addr) return fail(res, 404, 'Address not found');
    const wasDefault = addr.isDefault;
    customer.addresses.pull(addr._id);
    if (wasDefault && customer.addresses.length) customer.addresses[0].isDefault = true;
    await customer.save();
    ok(res, customer.addresses, 'Address deleted');
  } catch (err) { handleError(err, res, next); }
};

// ---------- Staff views (owner, admin, manager) ----------
// Least privilege: saved addresses are NOT returned to staff here. Delivery staff
// will get only the drop-off address of their assigned delivery (Module 3).

const STAFF_SELECT = '-addresses -__v';

// GET /api/customers?page=1&limit=20
exports.listCustomers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const [items, total] = await Promise.all([
      Customer.find().select(STAFF_SELECT).populate('user', 'name email')
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Customer.countDocuments(),
    ]);
    ok(res, { items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { handleError(err, res, next); }
};

// GET /api/customers/:id
exports.getCustomer = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, 'Invalid id');
    const customer = await Customer.findById(req.params.id)
      .select(STAFF_SELECT).populate('user', 'name email');
    if (!customer) return fail(res, 404, 'Customer not found');
    ok(res, customer);
  } catch (err) { handleError(err, res, next); }
};
