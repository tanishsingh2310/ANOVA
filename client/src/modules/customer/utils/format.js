// client/src/modules/customer/utils/format.js
import { CURRENCY } from '../config';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: CURRENCY });
export const formatPrice = (n) => money.format(Number(n) || 0);

export const formatDate = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '';

// Order status vocabulary is owned by Member 3. Unknown values fall back to the raw text.
export const STATUS_LABELS = {
  pending: 'Order received',
  confirmed: 'Confirmed',
  preparing: 'Being prepared',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  completed: 'Collected',
  cancelled: 'Cancelled',
};
export const statusLabel = (s) => STATUS_LABELS[s] || s || 'Unknown';

export const ORDER_FLOW = {
  delivery: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'],
  takeaway: ['pending', 'confirmed', 'preparing', 'ready', 'completed'],
};
export const TERMINAL_STATUSES = ['delivered', 'completed', 'cancelled'];

// ---------- Branch opening hours ----------
// Expected shape (to be confirmed with Member 1): { open: "10:00", close: "23:00" }.
// This is for DISPLAY only. The server must refuse orders when a branch is closed.
const toMinutes = (t) => {
  const [h, m] = String(t || '').split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

export function isOpenNow(hours, now = new Date()) {
  if (!hours) return true; // unknown hours: do not block, the server decides
  const open = toMinutes(hours.open);
  const close = toMinutes(hours.close);
  if (open === null || close === null) return true;
  const n = now.getHours() * 60 + now.getMinutes();
  return open <= close ? n >= open && n < close : n >= open || n < close; // handles past-midnight
}

export const hoursLabel = (hours) => (hours ? `${hours.open} to ${hours.close}` : 'Hours not listed');

export const addressLine = (a) => (a ? [a.line1, a.city, a.postalCode].filter(Boolean).join(', ') : '');

// One-line summary of an offer, e.g. "10% off, up to Rs 100, on orders over Rs 200".
export function describeOffer(o) {
  const main = o.discountType === 'percent' ? `${o.discountValue}% off` : `${formatPrice(o.discountValue)} off`;
  const cap = o.discountType === 'percent' && o.maxDiscount ? `, up to ${formatPrice(o.maxDiscount)}` : '';
  const min = o.minOrderAmount > 0 ? `, on orders over ${formatPrice(o.minOrderAmount)}` : '';
  return main + cap + min;
}

// ---------- Delivery (its own status list, separate from the order status) ----------
export const DELIVERY_LABELS = {
  pending: 'Waiting for a rider',
  assigned: 'Rider assigned',
  picked_up: 'Picked up',
  on_the_way: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
export const deliveryLabel = (s) => DELIVERY_LABELS[s] || s || 'Unknown';

// What a rider can do next, per current delivery status.
export const RIDER_NEXT = {
  assigned: { to: 'picked_up', label: 'Mark picked up' },
  picked_up: { to: 'on_the_way', label: 'Start delivery' },
  on_the_way: { to: 'delivered', label: 'Mark delivered' },
};

// "45 seconds" or "2 min". Demo trips are short, so seconds are shown under a minute.
export function formatEta(sec) {
  if (sec == null) return '';
  return sec < 60 ? `${Math.max(sec, 1)} seconds` : `${Math.ceil(sec / 60)} min`;
}

// One plain sentence describing the rider's position, shown under the map.
export function trackingText(t) {
  switch (t.status) {
    case 'assigned': return 'Your rider has been assigned and is at the restaurant.';
    case 'picked_up': return 'Your rider has picked up your order and is about to leave.';
    case 'on_the_way': return `Your rider is ${Math.round(t.progress * 100)}% of the way. Arriving in about ${formatEta(t.etaSeconds)}.`;
    case 'delivered': return 'Your order has arrived.';
    default: return '';
  }
}

// ---------- Feedback ----------
export const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export const COMPLAINT_LABELS = { open: 'Open', in_review: 'Being reviewed', resolved: 'Resolved', rejected: 'Not upheld' };
export const complaintLabel = (s) => COMPLAINT_LABELS[s] || s;
export const CATEGORY_LABELS = { food: 'Food', delivery: 'Delivery', service: 'Service', billing: 'Billing', other: 'Other' };
