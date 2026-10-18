// client/src/modules/customer/mock/mockBackend.js
// MOCK ONLY. Imitates what Member 3's menu and order API will do, including the
// important rule: the SERVER (not the browser) works out prices and totals.
// Orders live in this browser's localStorage, so they are not shared or real.
import { MOCK_MENU } from './menuData';
import { MOCK_BRANCHES } from './branchData';
import { MOCK_COUPONS } from './couponData';
import { MOCK_STAFF } from './staffData';
import { simulatedState } from '../utils/geo';
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
