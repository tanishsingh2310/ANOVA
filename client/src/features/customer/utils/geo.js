// client/src/modules/customer/utils/geo.js
// DEMO MODE ONLY. A copy of server/services/trackingService.js so the demo map moves the
// same way as the real API. In real mode the server returns the position and this is unused.
import { SIM_CENTER, SIM_TRIP_SECONDS } from '../config';

const ROUTE_POINTS = 40;
const round6 = (n) => Math.round(n * 1e6) / 1e6;
const clamp01 = (n) => Math.min(1, Math.max(0, n));
const isPoint = (p) => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng);

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function offsetPoint(from, seed) {
  const angle = ((hash(seed) % 360) * Math.PI) / 180;
  const km = 1.5 + (hash(`${seed}:d`) % 250) / 100;
  const dLat = (km / 111) * Math.cos(angle);
  const dLng = (km / (111 * Math.cos((from.lat * Math.PI) / 180))) * Math.sin(angle);
  return { lat: round6(from.lat + dLat), lng: round6(from.lng + dLng) };
}

function resolvePoints(seed, pickup, dropoff) {
  const a = isPoint(pickup) ? { lat: pickup.lat, lng: pickup.lng } : SIM_CENTER;
  let b = isPoint(dropoff) ? { lat: dropoff.lat, lng: dropoff.lng } : offsetPoint(a, seed);
  if (Math.abs(a.lat - b.lat) < 0.0005 && Math.abs(a.lng - b.lng) < 0.0005) b = offsetPoint(a, seed);
  return { pickup: a, dropoff: b };
}

function controlPoint(a, b, seed) {
  const sign = hash(`${seed}:c`) % 2 ? 1 : -1;
  return {
    lat: (a.lat + b.lat) / 2 + sign * 0.25 * -(b.lng - a.lng),
    lng: (a.lng + b.lng) / 2 + sign * 0.25 * (b.lat - a.lat),
  };
}

function bezier(a, b, c, t) {
  const u = 1 - t;
  return {
    lat: round6(u * u * a.lat + 2 * u * t * c.lat + t * t * b.lat),
    lng: round6(u * u * a.lng + 2 * u * t * c.lng + t * t * b.lng),
  };
}

export function simulatedState(delivery, now = Date.now()) {
  const seed = String(delivery.order);
  const { pickup, dropoff } = resolvePoints(seed, delivery.pickup?.location, delivery.dropoff?.location);
  const control = controlPoint(pickup, dropoff, seed);
  const at = (t) => bezier(pickup, dropoff, control, t);
  const route = Array.from({ length: ROUTE_POINTS + 1 }, (_, i) => at(i / ROUTE_POINTS));

  let position = null;
  let progress = 0;
  let etaSeconds = null;

  switch (delivery.status) {
    case 'assigned':
    case 'picked_up':
      position = at(0);
      break;
    case 'on_the_way': {
      const entry = [...(delivery.timeline || [])].reverse().find((t) => t.status === 'on_the_way');
      const startedAt = entry ? new Date(entry.at).getTime() : now;
      progress = clamp01((now - startedAt) / (SIM_TRIP_SECONDS * 1000));
      position = at(progress);
      etaSeconds = Math.ceil((1 - progress) * SIM_TRIP_SECONDS);
      break;
    }
    case 'delivered':
      position = at(1);
      progress = 1;
      etaSeconds = 0;
      break;
    default:
      break;
  }
  return { pickup, dropoff, route, position, progress: Math.round(progress * 1000) / 1000, etaSeconds };
}
