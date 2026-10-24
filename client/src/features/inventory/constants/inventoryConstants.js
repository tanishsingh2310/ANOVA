// ============================================================
// ANOVA INVENTORY CONSTANTS
// Standard units and categories for inventory items
// ============================================================

export const INGREDIENT_CATEGORIES = [
  'Produce & Greens',
  'Dairy & Cheese',
  'Meat & Poultry',
  'Seafood',
  'Pantry & Grains',
  'Spices & Condiments',
  'Beverages & Syrups',
  'Bakery & Pastry'
];

export const CANONICAL_UNITS = [
  { code: 'kg', name: 'Kilograms', type: 'weight', baseFactor: 1 },
  { code: 'g', name: 'Grams', type: 'weight', baseFactor: 0.001 },
  { code: 'L', name: 'Liters', type: 'volume', baseFactor: 1 },
  { code: 'ml', name: 'Milliliters', type: 'volume', baseFactor: 0.001 },
  { code: 'pcs', name: 'Pieces/Units', type: 'count', baseFactor: 1 },
  { code: 'box', name: 'Standard Box', type: 'count', baseFactor: 1 }
];
