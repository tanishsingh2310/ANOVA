// server/controllers/customerController.js
const Customer = require('../models/Customer');

const ok = (res, data, message = 'OK', code = 200) =>
  res.status(code).json({ success: true, data, message });

const getOrCreate = async (userId) => {
  let customer = await Customer.findOne({ user: userId });
  if (!customer) customer = await Customer.create({ user: userId });
  return customer;
};

const clearDefaults = (customer, exceptId) => {
  customer.addresses.forEach((a) => {
    if (String(a._id) !== String(exceptId)) a.isDefault = false;
  });
};

const ADDRESS_FIELDS = ['label', 'line1', 'city', 'postalCode', 'location', 'isDefault'];
const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

// GET /api/customers/me
exports.getMe = async (req, res, next) => {
  try {
    const customer = await getOrCreate(req.user.id);
    await customer.populate('user', 'name email');
    ok(res, customer);
  } catch (err) { next(err); }
};

// PUT /api/customers/me
exports.updateMe = async (req, res, next) => {
  try {
    const customer = await getOrCreate(req.user.id);
    if (req.body.phone !== undefined) customer.phone = req.body.phone;
    if (req.body.preferences) {
      const { dietary, favouriteBranch } = req.body.preferences;
      if (dietary) customer.preferences.dietary = dietary;
      if (favouriteBranch !== undefined) customer.preferences.favouriteBranch = favouriteBranch;
    }
    await customer.save();
    ok(res, customer, 'Profile updated');
  } catch (err) { next(err); }
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
  } catch (err) { next(err); }
};

// PUT /api/customers/me/addresses/:addressId
exports.updateAddress = async (req, res, next) => {
  try {
    const customer = await getOrCreate(req.user.id);
    const addr = customer.addresses.id(req.params.addressId);
    if (!addr) return res.status(404).json({ success: false, message: 'Address not found' });
    addr.set(pick(req.body, ADDRESS_FIELDS));
    if (addr.isDefault) clearDefaults(customer, addr._id);
    await customer.save();
    ok(res, customer.addresses, 'Address updated');
  } catch (err) { next(err); }
};

// DELETE /api/customers/me/addresses/:addressId
exports.deleteAddress = async (req, res, next) => {
  try {
    const customer = await getOrCreate(req.user.id);
    const addr = customer.addresses.id(req.params.addressId);
    if (!addr) return res.status(404).json({ success: false, message: 'Address not found' });
    const wasDefault = addr.isDefault;
    customer.addresses.pull(addr._id);
    if (wasDefault && customer.addresses.length) customer.addresses[0].isDefault = true;
    await customer.save();
    ok(res, customer.addresses, 'Address deleted');
  } catch (err) { next(err); }
};

// GET /api/customers  (staff only, with simple search + paging)
exports.listCustomers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const [items, total] = await Promise.all([
      Customer.find().populate('user', 'name email')
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Customer.countDocuments(),
    ]);
    ok(res, { items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

// GET /api/customers/:id  (staff only)
exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id).populate('user', 'name email');
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    ok(res, customer);
  } catch (err) { next(err); }
};