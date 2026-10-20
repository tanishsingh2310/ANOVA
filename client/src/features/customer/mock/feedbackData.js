// client/src/modules/customer/mock/feedbackData.js
// MOCK DATA ONLY (demo mode). Gives the branch ratings and the staff screen something to show.
const day = (n) => new Date(Date.now() - n * 86400000).toISOString();

export const MOCK_REVIEWS = [
  { _id: 'mock-r1', order: 'seed-1', orderNumber: 'A-0901', branch: { _id: 'mock-b1', name: 'Ahmedabad - Satellite' }, orderType: 'delivery', foodRating: 5, deliveryRating: 4, comment: 'Hot and tasty, the butter chicken was excellent.', isHidden: false, reply: null, customerName: 'Priya', mine: false, createdAt: day(5) },
  { _id: 'mock-r2', order: 'seed-2', orderNumber: 'A-0902', branch: { _id: 'mock-b1', name: 'Ahmedabad - Satellite' }, orderType: 'takeaway', foodRating: 4, comment: 'Quick pickup.', isHidden: false, reply: null, customerName: 'Kabir', mine: false, createdAt: day(4) },
  { _id: 'mock-r3', order: 'seed-3', orderNumber: 'S-0711', branch: { _id: 'mock-b2', name: 'Surat - Vesu' }, orderType: 'delivery', foodRating: 5, deliveryRating: 5, comment: 'Fish curry was great and the rider was polite.', isHidden: false, reply: { text: 'Thank you, we will pass this on to the team!', at: day(2) }, customerName: 'Meera', mine: false, createdAt: day(3) },
  { _id: 'mock-r4', order: 'seed-4', orderNumber: 'S-0712', branch: { _id: 'mock-b2', name: 'Surat - Vesu' }, orderType: 'delivery', foodRating: 2, deliveryRating: 2, comment: 'Arrived late and the naan was cold.', isHidden: false, reply: null, customerName: 'Arjun', mine: false, createdAt: day(2) },
  { _id: 'mock-r5', order: 'seed-5', orderNumber: 'S-0713', branch: { _id: 'mock-b2', name: 'Surat - Vesu' }, orderType: 'takeaway', foodRating: 4, isHidden: false, reply: null, customerName: 'Nisha', mine: false, createdAt: day(1) },
  { _id: 'mock-r6', order: 'seed-6', orderNumber: 'R-0501', branch: { _id: 'mock-b3', name: 'Rajkot - Kalawad Road' }, orderType: 'takeaway', foodRating: 4, comment: 'Lovely dal makhani.', isHidden: false, reply: null, customerName: 'Dev', mine: false, createdAt: day(1) },
];

export const MOCK_COMPLAINTS = [
  { _id: 'mock-c1', order: 'seed-4', orderNumber: 'S-0712', branch: { _id: 'mock-b2', name: 'Surat - Vesu' }, category: 'delivery', subject: 'Order arrived 40 minutes late', description: 'The food was cold when it reached me.', status: 'in_review', response: 'Sorry about this. We are speaking to the rider.', customerName: 'Arjun', mine: false, createdAt: day(2) },
  { _id: 'mock-c2', category: 'service', subject: 'Staff were rude at the counter', description: 'I was told to wait without any explanation.', status: 'open', branch: { _id: 'mock-b1', name: 'Ahmedabad - Satellite' }, customerName: 'Priya', mine: false, createdAt: day(0) },
];
