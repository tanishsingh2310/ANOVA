// client/src/modules/customer/config.js
// Module 2 settings. The branch, menu and order API paths are NOT confirmed yet
// (branches = Member 1, menu and orders = Member 3), so every path lives here.
// Change them in this one place when the team agrees.

// true  = data comes from mock/mockBackend.js (browser only, for demos)
// false = real API calls. Set VITE_USE_MOCK=false in client/.env once the real APIs work.
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

export const CURRENCY = 'INR';

export const ENDPOINTS = {
  branches: '/branches',
  menu: '/menu-items', // called with ?branch=<branchId>
  orders: '/orders',
  myOrders: '/orders/my',
  order: (id) => `/orders/${id}`,
  deliveries: '/deliveries',
  reviews: '/reviews',
  complaints: '/complaints',
};

// Demo mode only: how long the simulated rider takes to reach the customer.
// (Real mode: the server decides, see server/services/trackingService.js.)
export const SIM_TRIP_SECONDS = 90;
export const SIM_CENTER = { lat: 23.0225, lng: 72.5714 };
