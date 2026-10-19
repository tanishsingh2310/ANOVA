// server/services/trackingService.js  (Member 4, Module 4: SIMULATED GPS)
// There is no real GPS. The rider's position is calculated from the clock:
// while a delivery is "on_the_way", the rider moves along a curved path from the
// pickup point to the drop-off point over SIM_TRIP_SECONDS. Stateless, so it
// survives restarts and needs no timers or sockets.
//
// To use real GPS later, keep the API response shape and replace simulatedState()
// with the rider's last reported coordinates.
const DEFAULT_CENTER = {
  lat: Number(process.env.SIM_CENTER_LAT) || 18.5204,
  lng: Number(process.env.SIM_CENTER_LNG) || 73.8567,
};
const TRIP_SECONDS = Number(process.env.SIM_TRIP_SECONDS) > 0 ? Number(process.env.SIM_TRIP_SECONDS) : 90;
const ROUTE_POINTS = 40;

const round6 = (n) => Math.round(n * 1e6) / 1e6;
const clamp01 = (n) => Math.min(1, Math.max(0, n));
const isPoint = (p) => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng);

// Small stable hash so the same order always gets the same simulated route.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// A point 1.5 to 4 km away in a direction chosen from the seed.
function offsetPoint(from, seed) {
  const angle = ((hash(seed) % 360) * Math.PI) / 180;
  const km = 1.5 + (hash(`${seed}:d`) % 250) / 100;
  const dLat = (km / 111) * Math.cos(angle);
  const dLng = (km / (111 * Math.cos((from.lat * Math.PI) / 180))) * Math.sin(angle);
  return { lat: round6(from.lat + dLat), lng: round6(from.lng + dLng) };
}

// Real coordinates are used when the delivery has them. Missing ones are made up.
function resolvePoints(seed, pickup, dropoff) {
  const a = isPoint(pickup) ? { lat: pickup.lat, lng: pickup.lng } : DEFAULT_CENTER;
  let b = isPoint(dropoff) ? { lat: dropoff.lat, lng: dropoff.lng } : offsetPoint(a, seed);
  if (Math.abs(a.lat - b.lat) < 0.0005 && Math.abs(a.lng - b.lng) < 0.0005) b = offsetPoint(a, seed);
  return { pickup: a, dropoff: b };
}

// Quadratic curve: leaves the straight line a little so the path looks like a road.
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

// delivery needs: order, status, timeline[], pickup.location?, dropoff.location?
function simulatedState(delivery, now = Date.now()) {
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
      position = at(0); // rider is at the restaurant
      break;
    case 'on_the_way': {
      const entry = [...(delivery.timeline || [])].reverse().find((t) => t.status === 'on_the_way');
      const startedAt = entry ? new Date(entry.at).getTime() : now;
      progress = clamp01((now - startedAt) / (TRIP_SECONDS * 1000));
      position = at(progress);
      etaSeconds = Math.ceil((1 - progress) * TRIP_SECONDS);
      break;
    }
    case 'delivered':
      position = at(1);
      progress = 1;
      etaSeconds = 0;
      break;
    default: // pending, cancelled: no rider on the map
      break;
  }

  return { pickup, dropoff, route, position, progress: Math.round(progress * 1000) / 1000, etaSeconds };
}

module.exports = { TRIP_SECONDS, ROUTE_POINTS, hash, resolvePoints, simulatedState };
