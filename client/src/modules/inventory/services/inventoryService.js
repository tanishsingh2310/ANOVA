// ============================================================
// ANOVA INVENTORY SERVICE
// Handles Ingredients, Branch Quantities, Batches, Adjustments & Audits
// ============================================================

import {
  SEED_BRANCHES,
  SEED_INGREDIENTS,
  SEED_STOCK_MOVEMENTS,
  CANONICAL_UNITS,
  INGREDIENT_CATEGORIES
} from './mockData.js';

const STORAGE_KEYS = {
  INGREDIENTS: 'anova_inventory_ingredients',
  SUPPLIERS: 'anova_inventory_suppliers',
  MOVEMENTS: 'anova_inventory_movements',
  BRANCHES: 'anova_inventory_branches'
};

// Safe storage initializers
function getStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setStored(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Storage quota exceeded or error:', err);
  }
}

export const InventoryService = {
  // Branches
  getBranches() {
    return getStored(STORAGE_KEYS.BRANCHES, SEED_BRANCHES);
  },

  getCategories() {
    return INGREDIENT_CATEGORIES;
  },

  getCanonicalUnits() {
    return CANONICAL_UNITS;
  },

  // Ingredients CRUD
  getIngredients(filter = {}) {
    let items = getStored(STORAGE_KEYS.INGREDIENTS, SEED_INGREDIENTS);
    const { branchId, category, search, stockStatus } = filter;

    if (category && category !== 'ALL') {
      items = items.filter(i => i.category === category);
    }

    if (search && search.trim() !== '') {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q)
      );
    }

    if (stockStatus && stockStatus !== 'ALL') {
      items = items.filter(i => {
        const status = this.calculateStockStatus(i, branchId);
        return status.level === stockStatus;
      });
    }

    return items;
  },

  getIngredientById(id) {
    const items = getStored(STORAGE_KEYS.INGREDIENTS, SEED_INGREDIENTS);
    return items.find(i => i.id === id) || null;
  },

  saveIngredient(ingredientData) {
    const items = getStored(STORAGE_KEYS.INGREDIENTS, SEED_INGREDIENTS);
    if (ingredientData.id) {
      // Update
      const index = items.findIndex(i => i.id === ingredientData.id);
      if (index !== -1) {
        items[index] = { ...items[index], ...ingredientData };
        setStored(STORAGE_KEYS.INGREDIENTS, items);
        return items[index];
      }
    }

    // Create
    const newId = `ing_${Date.now().toString(36)}`;
    const newSku = ingredientData.sku || `ING-${ingredientData.category.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const newItem = {
      ...ingredientData,
      id: newId,
      sku: newSku,
      stockByBranch: ingredientData.stockByBranch || {
        b_downtown: 0,
        b_uptown: 0,
        b_westside: 0,
        b_waterfront: 0
      },
      batches: ingredientData.batches || []
    };
    items.unshift(newItem);
    setStored(STORAGE_KEYS.INGREDIENTS, items);
    return newItem;
  },

  deleteIngredient(id) {
    const items = getStored(STORAGE_KEYS.INGREDIENTS, SEED_INGREDIENTS);
    const filtered = items.filter(i => i.id !== id);
    setStored(STORAGE_KEYS.INGREDIENTS, filtered);
    return true;
  },

  // Stock Status Evaluation
  calculateStockStatus(ingredient, branchId = 'all') {
    const stock = branchId === 'all'
      ? Object.values(ingredient.stockByBranch || {}).reduce((sum, val) => sum + (Number(val) || 0), 0)
      : Number(ingredient.stockByBranch?.[branchId] || 0);

    const min = Number(ingredient.minThreshold || 0);
    const reorder = Number(ingredient.reorderLevel || min * 1.3);

    if (stock <= 0) {
      return { level: 'OUT_OF_STOCK', text: 'Out of Stock', color: 'danger', qty: stock };
    }
    if (stock <= min * 0.5) {
      return { level: 'CRITICAL', text: 'Critically Low', color: 'danger', qty: stock };
    }
    if (stock <= min || stock <= reorder) {
      return { level: 'LOW_STOCK', text: 'Low Stock', color: 'warning', qty: stock };
    }
    return { level: 'IN_STOCK', text: 'Adequate Stock', color: 'success', qty: stock };
  },

  // Expiry Checker
  getExpiringBatches(daysAhead = 7, branchId = 'all') {
    const ingredients = getStored(STORAGE_KEYS.INGREDIENTS, SEED_INGREDIENTS);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);

    const results = [];
    ingredients.forEach(ing => {
      (ing.batches || []).forEach(b => {
        if (branchId !== 'all' && b.branchId !== branchId) return;
        if (b.qty <= 0) return;

        const exp = new Date(b.expiryDate);
        const today = new Date();
        const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));

        if (diffDays <= daysAhead) {
          results.push({
            ingredientId: ing.id,
            ingredientName: ing.name,
            sku: ing.sku,
            unit: ing.baseUnit,
            batchNumber: b.batchNumber,
            branchId: b.branchId,
            qty: b.qty,
            expiryDate: b.expiryDate,
            diffDays,
            isExpired: diffDays <= 0
          });
        }
      });
    });

    return results.sort((a, b) => a.diffDays - b.diffDays);
  },

  // Stock Adjustment with Mandatory Audit Trail
  adjustStock({ ingredientId, branchId, newQty, reason, notes, user = 'Store Manager' }) {
    const items = getStored(STORAGE_KEYS.INGREDIENTS, SEED_INGREDIENTS);
    const index = items.findIndex(i => i.id === ingredientId);
    if (index === -1) throw new Error('Ingredient not found');

    const item = items[index];
    const prevQty = Number(item.stockByBranch?.[branchId] || 0);
    const updatedQty = Math.max(0, Number(newQty));
    const delta = updatedQty - prevQty;

    // Update branch stock
    if (!item.stockByBranch) item.stockByBranch = {};
    item.stockByBranch[branchId] = updatedQty;

    // Create Audit Log
    const movements = getStored(STORAGE_KEYS.MOVEMENTS, SEED_STOCK_MOVEMENTS);
    const movement = {
      id: `mov_${Date.now()}`,
      type: 'STOCK_ADJUSTMENT',
      reference: `ADJ-${reason || 'CORRECTION'}`,
      ingredientId,
      branchId,
      deltaQty: delta,
      unit: item.baseUnit,
      resultingBalance: updatedQty,
      performedBy: user,
      timestamp: new Date().toISOString(),
      notes: notes ? `${reason}: ${notes}` : reason
    };

    movements.unshift(movement);
    setStored(STORAGE_KEYS.MOVEMENTS, movements);
    setStored(STORAGE_KEYS.INGREDIENTS, items);

    return { item, movement };
  },

  // Movements / Audit History
  getMovements(filter = {}) {
    let movements = getStored(STORAGE_KEYS.MOVEMENTS, SEED_STOCK_MOVEMENTS);
    const { branchId, ingredientId, type } = filter;

    if (branchId && branchId !== 'all') {
      movements = movements.filter(m => m.branchId === branchId);
    }
    if (ingredientId) {
      movements = movements.filter(m => m.ingredientId === ingredientId);
    }
    if (type && type !== 'ALL') {
      movements = movements.filter(m => m.type === type);
    }

    return movements;
  }
};
