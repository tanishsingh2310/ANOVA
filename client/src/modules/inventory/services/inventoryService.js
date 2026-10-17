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
import { apiClient } from '../../../api/client.js';

export function normalizeIngredient(doc) {
  if (!doc) return null;
  const stockObj = {};
  if (doc.stockByBranch instanceof Map) {
    doc.stockByBranch.forEach((val, key) => { stockObj[key] = Number(val) || 0; });
  } else if (typeof doc.stockByBranch === 'object' && doc.stockByBranch !== null) {
    Object.assign(stockObj, doc.stockByBranch);
  }

  const batches = (doc.batches || []).map(b => ({
    id: String(b._id || b.id || `bat_${Math.random().toString(36).slice(2)}`),
    batchNumber: b.batchNumber,
    branchId: b.branch || b.branchId,
    qty: b.quantity !== undefined ? Number(b.quantity) : Number(b.qty || 0),
    expiryDate: b.expiryDate ? new Date(b.expiryDate).toISOString().split('T')[0] : '',
    receivedCost: b.receivedCost !== undefined ? Number(b.receivedCost) : Number(b.costPerUnit || doc.unitCost || 0)
  }));

  const ingId = String(doc._id || doc.id);
  const supId = doc.primarySupplier?._id ? String(doc.primarySupplier._id) : (doc.primarySupplier ? String(doc.primarySupplier) : doc.primarySupplierId);

  return {
    ...doc,
    id: ingId,
    _id: ingId,
    name: doc.name,
    sku: doc.sku,
    category: doc.category,
    baseUnit: doc.baseUnit,
    unitCost: Number(doc.unitCost || 0),
    minThreshold: Number(doc.minThreshold || 0),
    maxThreshold: Number(doc.maxThreshold || 0),
    reorderLevel: Number(doc.reorderLevel || 0),
    primarySupplierId: supId,
    primarySupplier: doc.primarySupplier,
    stockByBranch: stockObj,
    batches
  };
}

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
  },

  // ==========================================
  // REMOTE BACKEND / ATLAS SYNCHRONIZATION
  // ==========================================
  async syncFromBackend(branchId = 'all') {
    try {
      const res = await apiClient('/api/inventory/ingredients');
      if (res && res.success && Array.isArray(res.data)) {
        const normalized = res.data.map(normalizeIngredient);
        setStored(STORAGE_KEYS.INGREDIENTS, normalized);
        return normalized;
      }
    } catch (err) {
      console.warn('[InventoryService] Backend sync failed, using cached store:', err.message);
    }
    return this.getIngredients({ branchId });
  },

  async saveIngredientRemote(ingredientData) {
    const isUpdate = Boolean(ingredientData._id || (ingredientData.id && ingredientData.id.length === 24));
    const targetId = ingredientData._id || ingredientData.id;

    const payload = {
      name: ingredientData.name,
      sku: ingredientData.sku,
      category: ingredientData.category,
      baseUnit: ingredientData.baseUnit,
      unitCost: Number(ingredientData.unitCost),
      minThreshold: Number(ingredientData.minThreshold),
      maxThreshold: Number(ingredientData.maxThreshold || ingredientData.minThreshold * 3),
      reorderLevel: Number(ingredientData.reorderLevel || ingredientData.minThreshold * 1.3),
      primarySupplier: ingredientData.primarySupplierId || undefined,
      stockByBranch: ingredientData.stockByBranch || {
        b_downtown: 0,
        b_uptown: 0,
        b_westside: 0,
        b_waterfront: 0
      }
    };

    try {
      const endpoint = isUpdate ? `/api/inventory/ingredients/${targetId}` : '/api/inventory/ingredients';
      const method = isUpdate ? 'PUT' : 'POST';
      const res = await apiClient(endpoint, { method, body: payload });
      if (res && res.success && res.data) {
        const normalized = normalizeIngredient(res.data);
        const items = getStored(STORAGE_KEYS.INGREDIENTS, SEED_INGREDIENTS);
        const idx = items.findIndex(i => i.id === normalized.id);
        if (idx !== -1) {
          items[idx] = normalized;
        } else {
          items.unshift(normalized);
        }
        setStored(STORAGE_KEYS.INGREDIENTS, items);
        return normalized;
      }
    } catch (err) {
      console.warn('[InventoryService] Remote save failed, falling back to local:', err.message);
    }
    return this.saveIngredient(ingredientData);
  },

  async deleteIngredientRemote(id) {
    try {
      await apiClient(`/api/inventory/ingredients/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('[InventoryService] Remote delete failed, falling back to local:', err.message);
    }
    return this.deleteIngredient(id);
  },

  async adjustStockRemote({ ingredientId, branchId, newQty, reason, notes, user = 'Store Manager' }) {
    try {
      const res = await apiClient(`/api/inventory/ingredients/${ingredientId}/adjust`, {
        method: 'POST',
        body: {
          branch: branchId,
          newQuantity: Number(newQty),
          reason,
          notes,
          user
        }
      });
      if (res && res.success && res.data) {
        const updatedIng = normalizeIngredient(res.data.ingredient);
        const items = getStored(STORAGE_KEYS.INGREDIENTS, SEED_INGREDIENTS);
        const idx = items.findIndex(i => i.id === updatedIng.id);
        if (idx !== -1) {
          items[idx] = updatedIng;
          setStored(STORAGE_KEYS.INGREDIENTS, items);
        }
        return { item: updatedIng, movement: res.data.movement };
      }
    } catch (err) {
      console.warn('[InventoryService] Remote adjust failed, falling back to local:', err.message);
    }
    return this.adjustStock({ ingredientId, branchId, newQty, reason, notes, user });
  },

  async getExpiringBatchesRemote(daysAhead = 7, branchId = 'all') {
    try {
      const branchQuery = branchId && branchId !== 'all' ? `&branch=${branchId}` : '';
      const res = await apiClient(`/api/inventory/batches/expiring?days=${daysAhead}${branchQuery}`);
      if (res && res.success && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (err) {
      console.warn('[InventoryService] Remote expiring batches failed, falling back:', err.message);
    }
    return this.getExpiringBatches(daysAhead, branchId);
  },

  async getMovementsRemote(filter = {}) {
    try {
      const params = new URLSearchParams();
      if (filter.branchId && filter.branchId !== 'all') params.append('branch', filter.branchId);
      if (filter.type && filter.type !== 'ALL') params.append('type', filter.type);
      const query = params.toString() ? `?${params.toString()}` : '';

      const res = await apiClient(`/api/inventory/movements${query}`);
      if (res && res.success && Array.isArray(res.data)) {
        const mapped = res.data.map(m => ({
          ...m,
          id: String(m._id || m.id),
          ingredientId: String(m.ingredient?._id || m.ingredient || m.ingredientId),
          ingredientName: m.ingredient?.name || 'Ingredient',
          branchId: m.branch,
          user: m.performedBy,
          notes: m.notes
        }));
        setStored(STORAGE_KEYS.MOVEMENTS, mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[InventoryService] Remote movements failed, falling back:', err.message);
    }
    return this.getMovements(filter);
  }
};
