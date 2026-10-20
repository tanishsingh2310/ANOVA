// client/src/modules/customer/mock/mockBackend.js
// MOCK ONLY. Imitates what Member 3's menu and order API will do, including the
// important rule: the SERVER (not the browser) works out prices and totals.
// Orders live in this browser's localStorage, so they are not shared or real.
import { MOCK_MENU } from './menuData';
import { MOCK_BRANCHES } from './branchData';
import { MOCK_COUPONS } from './couponData';
import { MOCK_STAFF } from './staffData';
import { simulatedState } from '../utils/geo';
import { MOCK_REVIEWS, MOCK_COMPLAINTS } from './feedbackData';
import { isOpenNow } from '../utils/format';

const KEY = 'anova_mock_orders_v1';
const DKEY = 'anova_mock_deliveries_v1';
const RIDER_KEY = 'anova_mock_rider';
const TAX_RATE = 0.05;
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
};
const readD = () => {
  try { return JSON.parse(localStorage.getItem(DKEY)) || []; } catch { return []; }
};
const writeD = (list) => {
  try { localStorage.setItem(DKEY, JSON.stringify(list)); } catch { /* storage full or blocked */ }
};
const write = (orders) => {
  try { localStorage.setItem(KEY, JSON.stringify(orders)); } catch { /* storage full or blocked */ }
};

// Same error shape as axios, so errorMessage() works unchanged.
const reject = (status, message) => {
  const e = new Error(message);
  e.response = { status, data: { success: false, message } };
  return e;
};

// Status moves forward with time so the tracking page can be demonstrated.
const TIMELINE = {
  delivery: [[0, 'pending'], [8, 'confirmed'], [20, 'preparing'], [40, 'ready']], // after 'ready' the delivery decides
  takeaway: [[0, 'pending'], [8, 'confirmed'], [20, 'preparing'], [40, 'ready'], [70, 'completed']],
};
const DELIVERY_TO_ORDER = {
  pending: 'ready', assigned: 'ready', picked_up: 'out_for_delivery', on_the_way: 'out_for_delivery', delivered: 'delivered',
};
const withStatus = (order) => {
  if (order.status === 'cancelled') return order;
  const secs = (Date.now() - order.createdAtMs) / 1000;
  const steps = TIMELINE[order.orderType] || TIMELINE.delivery;
  const current = [...steps].reverse().find(([s]) => secs >= s);
  let status = current[1];
  if (order.orderType === 'delivery') {
    const d = readD().find((x) => x.order === order._id);
    if (d?.status === 'cancelled') status = 'cancelled';
    else if (d && status === 'ready') status = DELIVERY_TO_ORDER[d.status] || 'ready';
  }
  return { ...order, status };
};


const round2 = (n) => Math.round(n * 100) / 100;

// Same rules as server/services/couponService.js, for demo mode.
function evalMockCoupon(code, branchId, subtotal) {
  const c = MOCK_COUPONS.find((x) => x.code === String(code || '').trim().toUpperCase() && x.isActive);
  if (!c) throw reject(400, 'This code is not valid');
  if (c.branches.length && !c.branches.includes(branchId)) {
    throw reject(400, 'This offer is not available at the selected branch');
  }
  if (subtotal < c.minOrderAmount) throw reject(400, `Spend at least ${c.minOrderAmount} to use this code`);
  const uses = read().filter((o) => o.couponCode === c.code).length;
  if (uses >= c.perCustomerLimit) throw reject(400, 'You have already used this code');
  let d = c.discountType === 'percent' ? (subtotal * c.discountValue) / 100 : c.discountValue;
  if (c.discountType === 'percent' && c.maxDiscount) d = Math.min(d, c.maxDiscount);
  return { coupon: c, discount: round2(Math.min(d, subtotal)) };
}

export async function mockValidateCoupon({ code, branch, subtotal }) {
  await wait(200);
  const { coupon, discount } = evalMockCoupon(code, branch, subtotal);
  return { code: coupon.code, title: coupon.title, discount };
}

export async function mockGetOffers(branchId) {
  await wait();
  return MOCK_COUPONS
    .filter((c) => c.isActive && c.isPublic && (!branchId || !c.branches.length || c.branches.includes(branchId)))
    .map(({ isPublic, isActive, perCustomerLimit, ...offer }) => offer);
}

export async function mockGetBranches() {
  await wait();
  return MOCK_BRANCHES.filter((b) => b.isActive);
}

export async function mockGetMenu(branchId) {
  await wait();
  if (!MOCK_BRANCHES.some((b) => b._id === branchId && b.isActive)) throw reject(404, 'Branch not found');
  return MOCK_MENU.filter((m) => m.branches.includes(branchId)).map(({ branches, ...dish }) => dish);
}

export async function mockPlaceOrder(payload) {
  await wait(400);
  const branch = MOCK_BRANCHES.find((b) => b._id === payload.branch && b.isActive);
  if (!branch) throw reject(400, 'Please choose a branch');
  if (!isOpenNow(branch.operatingHours)) {
    throw reject(400, `${branch.name} is closed right now. It opens at ${branch.operatingHours.open}.`);
  }
  if (!['delivery', 'takeaway'].includes(payload.orderType)) throw reject(400, 'Choose delivery or takeaway');
  if (!Array.isArray(payload.items) || payload.items.length === 0) throw reject(400, 'Your cart is empty');
  if (payload.orderType === 'delivery' && !payload.delivery?.address?.line1) {
    throw reject(400, 'A delivery address is required');
  }

  const lines = payload.items.map((i) => {
    const m = MOCK_MENU.find((x) => x._id === i.menuItem);
    const qty = Math.floor(Number(i.quantity));
    if (!m) throw reject(400, 'An item in your cart is no longer on the menu');
    if (!m.branches.includes(branch._id)) throw reject(400, `${m.name} is not served at ${branch.name}`);
    if (!m.isAvailable) throw reject(400, `${m.name} is not available right now`);
    if (!(qty >= 1 && qty <= 20)) throw reject(400, `Invalid quantity for ${m.name}`);
    return { menuItem: m._id, name: m.name, price: m.price, quantity: qty }; // price snapshot
  });

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  // The server works out the discount itself. The browser only sends the code.
  let discount = 0;
  let couponCode;
  if (payload.couponCode) {
    const r = evalMockCoupon(payload.couponCode, branch._id, subtotal);
    discount = r.discount;
    couponCode = r.coupon.code;
  }
  const tax = round2((subtotal - discount) * TAX_RATE);
  const orders = read();
  const now = Date.now();
  const order = {
    _id: `mock-order-${now.toString(36)}`,
    orderNumber: `A-${1000 + orders.length + 1}`,
    branch: { _id: branch._id, name: branch.name, address: branch.address },
    orderType: payload.orderType,
    status: 'pending',
    items: lines,
    subtotal,
    discount,
    couponCode,
    tax,
    total: round2(subtotal - discount + tax),
    notes: payload.notes,
    delivery: payload.delivery,
    createdAt: new Date(now).toISOString(),
    createdAtMs: now,
  };
  write([order, ...orders]);
  if (order.orderType === 'delivery') {
    const iso = new Date(now).toISOString();
    writeD([{
      _id: `mock-del-${now.toString(36)}`,
      order: order._id,
      orderNumber: order.orderNumber,
      pickup: { name: branch.name, address: branch.address },
      dropoff: { address: payload.delivery.address },
      customerName: 'Demo customer',
      customerPhone: payload.contactPhone,
      itemCount: lines.reduce((n, l) => n + l.quantity, 0),
      deliveryStaff: null,
      status: 'pending',
      timeline: [{ status: 'pending', at: iso }],
      createdAt: iso,
    }, ...readD()]);
  }
  return withStatus(order);
}

export async function mockGetMyOrders() {
  await wait();
  return read().map(withStatus);
}

export async function mockGetOrder(id) {
  await wait(150);
  const order = read().find((o) => o._id === id);
  if (!order) throw reject(404, 'Order not found');
  return withStatus(order);
}

// ---------- Deliveries (demo) ----------
const ACTIVE_D = ['pending', 'assigned', 'picked_up', 'on_the_way'];
const RIDER_NEXT = { assigned: 'picked_up', picked_up: 'on_the_way', on_the_way: 'delivered' };
const withRider = (d) => ({ ...d, deliveryStaff: MOCK_STAFF.find((s) => s._id === d.deliveryStaff) || null });
const stamp = (d, status) => d.timeline.push({ status, at: new Date().toISOString() });

export const getMockRider = () => {
  try { return localStorage.getItem(RIDER_KEY) || MOCK_STAFF[0]._id; } catch { return MOCK_STAFF[0]._id; }
};
export const setMockRider = (id) => {
  try { localStorage.setItem(RIDER_KEY, id); } catch { /* ignore */ }
};

export async function mockListDeliveries({ status } = {}) {
  await wait();
  const all = readD();
  const counts = {};
  all.forEach((d) => { counts[d.status] = (counts[d.status] || 0) + 1; });
  const items = (status ? all.filter((d) => d.status === status) : all).map(withRider);
  return { items, total: items.length, counts };
}

export async function mockListStaff() {
  await wait(150);
  const busy = readD().filter((d) => ['assigned', 'picked_up', 'on_the_way'].includes(d.status));
  return MOCK_STAFF.map((s) => ({ ...s, activeCount: busy.filter((d) => d.deliveryStaff === s._id).length }));
}

export async function mockAssignDelivery(id, staffId) {
  await wait();
  const list = readD();
  const d = list.find((x) => x._id === id);
  if (!d) throw reject(404, 'Delivery not found');
  if (!['pending', 'assigned'].includes(d.status)) throw reject(409, 'This delivery can no longer be assigned');
  if (!MOCK_STAFF.some((s) => s._id === staffId)) throw reject(400, 'Choose a valid delivery staff member');
  d.deliveryStaff = staffId;
  d.status = 'assigned';
  d.assignedAt = new Date().toISOString();
  stamp(d, 'assigned');
  writeD(list);
  return withRider(d);
}

export async function mockCancelDelivery(id, reason) {
  await wait();
  const list = readD();
  const d = list.find((x) => x._id === id);
  if (!d) throw reject(404, 'Delivery not found');
  if (!ACTIVE_D.includes(d.status)) throw reject(409, 'Only an unfinished delivery can be cancelled');
  d.status = 'cancelled';
  d.cancelledReason = reason || undefined;
  stamp(d, 'cancelled');
  writeD(list);
  return withRider(d);
}

export async function mockMyDeliveries({ history = false } = {}) {
  await wait();
  const rider = getMockRider();
  const mine = readD().filter((d) => d.deliveryStaff === rider);
  return mine.filter((d) => (history ? ['delivered', 'cancelled'].includes(d.status) : ['assigned', 'picked_up', 'on_the_way'].includes(d.status)));
}

export async function mockRiderUpdate(id, status) {
  await wait();
  const list = readD();
  const d = list.find((x) => x._id === id && x.deliveryStaff === getMockRider());
  if (!d) throw reject(404, 'Delivery not found');
  if (RIDER_NEXT[d.status] !== status) throw reject(409, 'That step is not allowed right now');
  d.status = status;
  if (status === 'delivered') d.deliveredAt = new Date().toISOString();
  stamp(d, status);
  writeD(list);
  return d;
}

export async function mockTracking(orderId) {
  await wait(150);
  const d = readD().find((x) => x.order === orderId);
  if (!d) throw reject(404, 'No delivery for this order yet');
  const staff = MOCK_STAFF.find((s) => s._id === d.deliveryStaff);
  const sim = simulatedState(d);
  const showMap = ['assigned', 'picked_up', 'on_the_way', 'delivered'].includes(d.status);
  return {
    status: d.status,
    riderName: staff?.name.split(' ')[0],
    assignedAt: d.assignedAt,
    deliveredAt: d.deliveredAt,
    pickup: { name: d.pickup?.name, location: sim.pickup },
    dropoff: { location: sim.dropoff },
    route: showMap ? sim.route : [],
    position: sim.position,
    progress: sim.progress,
    etaSeconds: sim.etaSeconds,
    isSimulated: true,
  };
}

// ---------- Reviews and complaints (demo) ----------
const RKEY = 'anova_mock_reviews_v1';
const CKEY = 'anova_mock_complaints_v1';
const readList = (key, seed) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through to the seed */ }
  const copy = seed.map((x) => ({ ...x }));
  try { localStorage.setItem(key, JSON.stringify(copy)); } catch { /* ignore */ }
  return copy;
};
const saveList = (key, list) => {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* ignore */ }
};
const whole = (v) => (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 5 ? Number(v) : null);
const myOrder = (id) => {
  const o = read().find((x) => x._id === id);
  return o ? withStatus(o) : null;
};

export async function mockCreateReview(b) {
  await wait(300);
  const food = whole(b.foodRating);
  if (food === null) throw reject(400, 'Give the food a rating from 1 to 5');
  const hasDelivery = b.deliveryRating !== undefined && b.deliveryRating !== null && b.deliveryRating !== '';
  const delivery = hasDelivery ? whole(b.deliveryRating) : undefined;
  if (hasDelivery && delivery === null) throw reject(400, 'Give the delivery a rating from 1 to 5');

  const order = myOrder(b.order);
  if (!order) throw reject(404, 'Order not found');
  if (!['delivered', 'completed'].includes(order.status)) throw reject(409, 'You can review an order after it is delivered or collected');
  if (hasDelivery && order.orderType !== 'delivery') throw reject(400, 'Delivery ratings only apply to delivery orders');

  const list = readList(RKEY, MOCK_REVIEWS);
  if (list.some((r) => r.order === order._id)) throw reject(409, 'You have already reviewed this order');
  const review = {
    _id: `mock-r-${Date.now().toString(36)}`, order: order._id, orderNumber: order.orderNumber,
    branch: { _id: order.branch._id, name: order.branch.name }, orderType: order.orderType,
    foodRating: food, deliveryRating: delivery, comment: String(b.comment || '').trim().slice(0, 500) || undefined,
    isHidden: false, reply: null, customerName: 'You', mine: true, createdAt: new Date().toISOString(),
  };
  saveList(RKEY, [review, ...list]);
  return review;
}

export async function mockMyReviews() {
  await wait(150);
  return readList(RKEY, MOCK_REVIEWS).filter((r) => r.mine);
}

export async function mockReviewSummary() {
  await wait(150);
  const by = {};
  readList(RKEY, MOCK_REVIEWS).filter((r) => !r.isHidden).forEach((r) => {
    const k = r.branch._id;
    by[k] = by[k] || { sum: 0, count: 0 };
    by[k].sum += r.foodRating;
    by[k].count += 1;
  });
  return Object.entries(by).map(([branch, v]) => ({ branch, average: Math.round((v.sum / v.count) * 10) / 10, count: v.count }));
}

export async function mockListReviews({ low, hidden } = {}) {
  await wait();
  let items = readList(RKEY, MOCK_REVIEWS);
  if (low) items = items.filter((r) => r.foodRating <= 2);
  if (hidden) items = items.filter((r) => r.isHidden);
  return { items, total: items.length };
}

export async function mockModerateReview(id, b) {
  await wait(200);
  const list = readList(RKEY, MOCK_REVIEWS);
  const r = list.find((x) => x._id === id);
  if (!r) throw reject(404, 'Review not found');
  if (typeof b.isHidden === 'boolean') r.isHidden = b.isHidden;
  if (b.reply !== undefined) {
    const text = String(b.reply).trim();
    r.reply = text ? { text: text.slice(0, 500), at: new Date().toISOString() } : null;
  }
  saveList(RKEY, list);
  return r;
}

export async function mockCreateComplaint(b) {
  await wait(300);
  if (!String(b.subject || '').trim()) throw reject(400, 'Please add a subject');
  if (b.category !== undefined && !['food', 'delivery', 'service', 'billing', 'other'].includes(b.category)) throw reject(400, 'Invalid category');
  const list = readList(CKEY, MOCK_COMPLAINTS);
  if (list.filter((c) => c.mine && ['open', 'in_review'].includes(c.status)).length >= 5) {
    throw reject(409, 'You already have 5 complaints being handled. Please wait for a reply first.');
  }
  let order = null;
  if (b.order) {
    order = myOrder(b.order);
    if (!order) throw reject(404, 'Order not found');
  }
  const c = {
    _id: `mock-c-${Date.now().toString(36)}`, order: order?._id, orderNumber: order?.orderNumber,
    branch: order ? { _id: order.branch._id, name: order.branch.name } : undefined,
    category: b.category || 'other', subject: String(b.subject).trim().slice(0, 100),
    description: String(b.description || '').trim().slice(0, 1000) || undefined,
    status: 'open', customerName: 'You', mine: true, createdAt: new Date().toISOString(),
  };
  saveList(CKEY, [c, ...list]);
  return c;
}

export async function mockMyComplaints() {
  await wait(150);
  return readList(CKEY, MOCK_COMPLAINTS).filter((c) => c.mine);
}

export async function mockListComplaints({ status } = {}) {
  await wait();
  const all = readList(CKEY, MOCK_COMPLAINTS);
  const counts = {};
  all.forEach((c) => { counts[c.status] = (counts[c.status] || 0) + 1; });
  const items = status ? all.filter((c) => c.status === status) : all;
  return { items, total: items.length, counts };
}

const COMPLAINT_NEXT = { open: ['in_review', 'resolved', 'rejected'], in_review: ['resolved', 'rejected'] };
export async function mockUpdateComplaint(id, b) {
  await wait(250);
  const list = readList(CKEY, MOCK_COMPLAINTS);
  const c = list.find((x) => x._id === id);
  if (!c) throw reject(404, 'Complaint not found');
  if (['resolved', 'rejected'].includes(c.status)) throw reject(409, 'This complaint is already closed');
  let next = c.status;
  if (b.status !== undefined && b.status !== c.status) {
    if (!(COMPLAINT_NEXT[c.status] || []).includes(b.status)) throw reject(409, 'That status change is not allowed');
    next = b.status;
  }
  const response = b.response !== undefined ? String(b.response).trim().slice(0, 1000) : c.response;
  if (['resolved', 'rejected'].includes(next) && !response) throw reject(400, 'Write a response before closing this complaint');
  c.status = next;
  c.response = response || undefined;
  c.respondedAt = new Date().toISOString();
  saveList(CKEY, list);
  return c;
}
