// client/src/modules/customer/mock/couponData.js
// MOCK DATA ONLY (demo mode). With the real API, coupons come from /api/coupons.
export const MOCK_COUPONS = [
  { code: 'WELCOME10', title: 'Welcome offer', description: '10% off your order, up to 100.', discountType: 'percent', discountValue: 10, minOrderAmount: 200, maxDiscount: 100, perCustomerLimit: 1, branches: [], isPublic: true, isActive: true },
  { code: 'FLAT50', title: 'Flat 50 off', description: '50 off orders above 300.', discountType: 'fixed', discountValue: 50, minOrderAmount: 300, perCustomerLimit: 3, branches: [], isPublic: true, isActive: true },
  { code: 'DINNER20', title: 'Dinner special', description: '20% off at the Rajkot branch.', discountType: 'percent', discountValue: 20, minOrderAmount: 0, maxDiscount: 150, perCustomerLimit: 2, branches: ['mock-b3'], isPublic: true, isActive: true },
  { code: 'VIP25', title: 'Private offer', description: '25% off, by code only.', discountType: 'percent', discountValue: 25, minOrderAmount: 0, maxDiscount: 200, perCustomerLimit: 1, branches: [], isPublic: false, isActive: true },
];
