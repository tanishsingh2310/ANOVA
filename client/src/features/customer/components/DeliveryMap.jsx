// client/src/modules/customer/components/DeliveryMap.jsx
// Leaflet map with OpenStreetMap tiles. Uses plain Leaflet (no react-leaflet) so it works
// with any React version. Markers are CSS circles, so no image files are needed.
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pin = (cls, letter, extra = '') =>
  L.divIcon({
    className: extra,
    html: `<span class="map-pin ${cls}">${letter}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

export default function DeliveryMap({ route, pickup, dropoff, position }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const riderRef = useRef(null);

  // 1. Create the map once.
  useEffect(() => {
    const map = L.map(elRef.current, { scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      riderRef.current = null;
    };
  }, []);

  // 2. Draw the path and both ends. Only redone if the trip itself changes.
  const tripKey = `${pickup.lat},${pickup.lng}:${dropoff.lat},${dropoff.lng}`;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route?.length) return undefined;
    const line = L.polyline(route.map((p) => [p.lat, p.lng]), { weight: 4, opacity: 0.75, color: '#2D5652' }).addTo(map);
    const shop = L.marker([pickup.lat, pickup.lng], { icon: pin('pin-shop', 'R'), title: 'Restaurant', alt: 'Restaurant' }).addTo(map);
    const home = L.marker([dropoff.lat, dropoff.lng], { icon: pin('pin-home', 'H'), title: 'Your address', alt: 'Your address' }).addTo(map);
    map.invalidateSize();
    map.fitBounds(line.getBounds(), { padding: [32, 32] });
    return () => { line.remove(); shop.remove(); home.remove(); };
  }, [tripKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. Move the rider marker whenever a new position arrives.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!position) {
      riderRef.current?.remove();
      riderRef.current = null;
      return;
    }
    const latlng = [position.lat, position.lng];
    if (!riderRef.current) {
      riderRef.current = L.marker(latlng, {
        icon: pin('pin-rider', 'B', 'rider-marker'), title: 'Your rider', alt: 'Your rider', zIndexOffset: 1000,
      }).addTo(map);
    } else {
      riderRef.current.setLatLng(latlng);
    }
  }, [position?.lat, position?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={elRef} className="delivery-map" role="img"
      aria-label="Map showing the restaurant, your address and your rider" />
  );
}
