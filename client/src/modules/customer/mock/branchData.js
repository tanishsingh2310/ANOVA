// client/src/modules/customer/mock/branchData.js
// MOCK DATA ONLY. Replaced by Member 1's branch API.
export const MOCK_BRANCHES = [
  {
    _id: 'mock-b1', name: 'Ahmedabad - Satellite', isActive: true, phone: '079 5550 0101',
    address: { line1: '14 Satellite Road', city: 'Ahmedabad', postalCode: '380015' },
    operatingHours: { open: '00:00', close: '23:00' },
  },
  {
    _id: 'mock-b2', name: 'Surat - Vesu', isActive: true, phone: '0261 555 0202',
    address: { line1: '8 VIP Road, Vesu', city: 'Surat', postalCode: '395007' },
    operatingHours: { open: '11:00', close: '23:30' },
  },
  {
    _id: 'mock-b3', name: 'Rajkot - Kalawad Road', isActive: true, phone: '0281 555 0303',
    address: { line1: '22 Kalawad Road', city: 'Rajkot', postalCode: '360005' },
    operatingHours: { open: '18:00', close: '23:00' }, // dinner only, so you can see a closed branch
  },
];
