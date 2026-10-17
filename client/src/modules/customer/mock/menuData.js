// client/src/modules/customer/mock/menuData.js
// MOCK DATA ONLY. Replaced by Member 3's menu API. `branches` lists where a dish is served;
// the real API would return only the dishes of the requested branch.
export const MOCK_MENU = [
  { _id: 'mock-1', branches: ['mock-b1','mock-b2','mock-b3'], name: 'Paneer Tikka', description: 'Char-grilled cottage cheese with mint chutney.', price: 240, category: 'Starters', isAvailable: true },
  { _id: 'mock-2', branches: ['mock-b1','mock-b3'], name: 'Veg Spring Rolls', description: 'Crisp rolls with cabbage, carrot and glass noodles.', price: 180, category: 'Starters', isAvailable: true },
  { _id: 'mock-3', branches: ['mock-b1','mock-b2'], name: 'Chicken 65', description: 'Spiced fried chicken with curry leaves.', price: 280, category: 'Starters', isAvailable: true },
  { _id: 'mock-4', branches: ['mock-b1','mock-b2','mock-b3'], name: 'Butter Chicken', description: 'Tandoori chicken in a creamy tomato gravy.', price: 360, category: 'Mains', isAvailable: true },
  { _id: 'mock-5', branches: ['mock-b1','mock-b2','mock-b3'], name: 'Dal Makhani', description: 'Black lentils simmered overnight with butter.', price: 260, category: 'Mains', isAvailable: true },
  { _id: 'mock-6', branches: ['mock-b1','mock-b2','mock-b3'], name: 'Veg Biryani', description: 'Basmati rice layered with vegetables and saffron.', price: 290, category: 'Mains', isAvailable: true },
  { _id: 'mock-7', branches: ['mock-b2'], name: 'Fish Curry', description: 'Coastal fish curry with coconut and kokum.', price: 380, category: 'Mains', isAvailable: false },
  { _id: 'mock-8', branches: ['mock-b1','mock-b2','mock-b3'], name: 'Butter Naan', description: 'Soft tandoor-baked bread brushed with butter.', price: 60, category: 'Breads', isAvailable: true },
  { _id: 'mock-9', branches: ['mock-b1','mock-b3'], name: 'Garlic Roti', description: 'Whole wheat roti with roasted garlic.', price: 50, category: 'Breads', isAvailable: true },
  { _id: 'mock-10', branches: ['mock-b1','mock-b2','mock-b3'], name: 'Gulab Jamun', description: 'Two warm milk dumplings in cardamom syrup.', price: 110, category: 'Desserts', isAvailable: true },
  { _id: 'mock-11', branches: ['mock-b1','mock-b2','mock-b3'], name: 'Masala Chai', description: 'Strong tea with ginger and cardamom.', price: 50, category: 'Drinks', isAvailable: true },
  { _id: 'mock-12', branches: ['mock-b2','mock-b3'], name: 'Sweet Lassi', description: 'Chilled thick yoghurt drink.', price: 90, category: 'Drinks', isAvailable: true },
];
