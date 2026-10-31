// ============================================================
// ANOVA INVENTORY SERVICE
// Handles Ingredients, Branch Quantities, Batches, Adjustments & Audits
// ============================================================

import {
  CANONICAL_UNITS,
  INGREDIENT_CATEGORIES
} from '../constants/inventoryConstants.js';
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

const MOCK_BRANCH_IDS = new Set(['b_downtown', 'b_uptown', 'b_westside', 'b_waterfront']);

function isMockRecord(item) {
  if (!item) return false;
  const id = String(item.id || item._id || '');
  if (MOCK_BRANCH_IDS.has(id)) return true;
  if (MOCK_BRANCH_IDS.has(String(item.branch || item.branchId))) return true;
  if (/^(ing|sup|po|tr|wst|mov)_/.test(id) && id.length < 24) return true;
  return false;
}

// Safe storage initializers with automatic mock data purging
function getStored(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const clean = parsed.filter(item => !isMockRecord(item));
      if (clean.length !== parsed.length) {
        localStorage.setItem(key, JSON.stringify(clean));
      }
      return clean;
    }
    return Array.isArray(fallback) ? fallback : parsed;
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
    return getStored(STORAGE_KEYS.BRANCHES, []);
  },

  async getBranchesRemote() {
    try {
      const res = await apiClient('/api/branches');
      const rawList = Array.isArray(res)
        ? res
        : (Array.isArray(res?.branches) ? res.branches : (Array.isArray(res?.data) ? res.data : []));
      if (rawList && rawList.length > 0) {
        const branches = rawList.map(b => ({
          id: String(b._id || b.id),
          _id: String(b._id || b.id),
          name: b.name,
          code: b.code || (b.name ? b.name.substring(0, 3).toUpperCase() : ''),
          city: b.address?.city || b.city || '',
          address: b.address || '',
          isActive: b.isActive !== false
        }));
        setStored(STORAGE_KEYS.BRANCHES, branches);
        return branches;
      }
    } catch (err) {
      console.warn('[InventoryService] Remote branches fetch failed:', err.message);
    }
    return this.getBranches();
  },

  getCategories() {
    return INGREDIENT_CATEGORIES;
  },

  getCanonicalUnits() {
    return CANONICAL_UNITS;
  },

  // Ingredients CRUD
  getIngredients(filter = {}, branches = []) {
    let items = getStored(STORAGE_KEYS.INGREDIENTS, []);
    const { branchId, category, search, stockStatus } = filter;

    if (category && category !== 'ALL') {
      items = items.filter(i => i.category === category);
    }

    if (search && search.trim() !== '') {
      const q = search.toLowerCase();
      items = items.filter(i =>
        (i.name || '').toLowerCase().includes(q) ||
        (i.sku || '').toLowerCase().includes(q) ||
        (i.category || '').toLowerCase().includes(q)
      );
    }

    if (stockStatus && stockStatus !== 'ALL') {
      items = items.filter(i => {
        const status = this.calculateStockStatus(i, branchId, branches);
        return status.level === stockStatus;
      });
    }

    return items;
  },

  getIngredientById(id) {
    const items = getStored(STORAGE_KEYS.INGREDIENTS, []);
    return items.find(i => i.id === id) || null;
  },

  saveIngredient(ingredientData) {
    const items = getStored(STORAGE_KEYS.INGREDIENTS, []);
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
    const newId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newSku = ingredientData.sku || `ING-${(ingredientData.category || 'GEN').slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const newItem = {
      ...ingredientData,
      id: newId,
      sku: newSku,
      stockByBranch: ingredientData.stockByBranch || {},
      batches: ingredientData.batches || []
    };
    items.unshift(newItem);
    setStored(STORAGE_KEYS.INGREDIENTS, items);
    return newItem;
  },

  deleteIngredient(id) {
    const items = getStored(STORAGE_KEYS.INGREDIENTS, []);
    const filtered = items.filter(i => i.id !== id);
    setStored(STORAGE_KEYS.INGREDIENTS, filtered);
    return true;
  },

  // Stock Status Evaluation
  calculateStockStatus(ingredient, branchId = 'all', branches = []) {
    let stock = 0;
    const stockMap = ingredient.stockByBranch || {};
    if (branchId === 'all') {
      if (Array.isArray(branches) && branches.length > 0) {
        let total = 0;
        for (const b of branches) {
          const keys = [b.id, b._id, b.code].filter(Boolean);
          for (const k of keys) {
            if (stockMap[k] !== undefined) {
              total += Number(stockMap[k] || 0);
              break;
            }
          }
        }
        stock = total;
      } else {
        stock = Object.values(stockMap).reduce((sum, val) => sum + (Number(val) || 0), 0);
      }
    } else {
      const stockMap = ingredient.stockByBranch || {};
      const branchObj = Array.isArray(branches)
        ? branches.find(b => b.id === branchId || b._id === branchId || b.code === branchId)
        : null;
      const candidates = [branchId, branchObj?.code, branchObj?.id, branchObj?._id].filter(Boolean);
      let found = false;
      for (const k of candidates) {
        if (stockMap[k] !== undefined) {
          stock = Number(stockMap[k] || 0);
          found = true;
          break;
        }
      }
      if (!found) {
        stock = Number(stockMap[branchId] || 0);
      }
    }

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
    const ingredients = getStored(STORAGE_KEYS.INGREDIENTS, []);
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
    const items = getStored(STORAGE_KEYS.INGREDIENTS, []);
    const index = items.findIndex(i => i.id === ingredientId);
    if (index === -1) throw new Error('Ingredient not found');

    const item = items[index];
    const prevQty = Number(item.stockByBranch?.[branchId] || 0);
    const updatedQty = Math.max(0, Number(newQty));
    const delta = updatedQty - prevQty;

    // Update branch stock
    if (!item.stockByBranch) item.stockByBranch = {};
    item.stockByBranch[branchId] = updatedQty;

    // Synchronize batches via FIFO / adjustment batch
    if (!item.batches) item.batches = [];
    if (delta < 0) {
      let remainingToDeduct = Math.abs(delta);
      const branchBatches = item.batches
        .filter(b => (b.branchId === branchId || b.branch === branchId) && ((b.qty !== undefined ? b.qty : b.quantity) > 0))
        .sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0));

      for (const batch of branchBatches) {
        if (remainingToDeduct <= 0) break;
        const currentBatchQty = batch.qty !== undefined ? batch.qty : batch.quantity;
        const take = Math.min(currentBatchQty, remainingToDeduct);
        if (batch.qty !== undefined) batch.qty -= take;
        if (batch.quantity !== undefined) batch.quantity -= take;
        remainingToDeduct -= take;
      }
    } else if (delta > 0) {
      const exp = new Date();
      exp.setDate(exp.getDate() + 90);
      item.batches.push({
        id: `bat_${Date.now()}`,
        branchId,
        branch: branchId,
        batchNumber: `ADJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        qty: delta,
        quantity: delta,
        expiryDate: exp.toISOString().split('T')[0],
        receivedCost: Number(item.unitCost || 0)
      });
    }

    // Create Audit Log
    const movements = getStored(STORAGE_KEYS.MOVEMENTS, []);
    const movement = {
      id: `mov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
    let movements = getStored(STORAGE_KEYS.MOVEMENTS, []);
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
      const branchQuery = branchId && branchId !== 'all' ? `?branch=${branchId}` : '';
      const res = await apiClient(`/api/inventory/ingredients${branchQuery}`);
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
      name: ingredientData.name?.trim(),
      sku: ingredientData.sku?.trim() || `ING-${Math.floor(1000 + Math.random() * 9000)}`,
      category: ingredientData.category,
      baseUnit: ingredientData.baseUnit,
      unitCost: Number(ingredientData.unitCost),
      minThreshold: Number(ingredientData.minThreshold),
      maxThreshold: Number(ingredientData.maxThreshold || Number(ingredientData.minThreshold) * 3),
      reorderLevel: Number(ingredientData.reorderLevel || Number(ingredientData.minThreshold) * 1.3),
      primarySupplier: (ingredientData.primarySupplierId && ingredientData.primarySupplierId.length === 24) ? ingredientData.primarySupplierId : undefined,
      stockByBranch: ingredientData.stockByBranch || {}
    };

    const endpoint = isUpdate ? `/api/inventory/ingredients/${targetId}` : '/api/inventory/ingredients';
    const method = isUpdate ? 'PUT' : 'POST';
    try {
      const res = await apiClient(endpoint, { method, body: payload });
      if (res && res.success && res.data) {
        const normalized = normalizeIngredient(res.data);
        const items = getStored(STORAGE_KEYS.INGREDIENTS, []);
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
      console.warn('[InventoryService] Remote save ingredient failed, saving locally:', err.message);
      return this.saveIngredient(ingredientData);
    }
    return this.saveIngredient(ingredientData);
  },

  async deleteIngredientRemote(id) {
    try {
      await apiClient(`/api/inventory/ingredients/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('[InventoryService] Remote delete ingredient failed, deleting locally:', err.message);
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
        const items = getStored(STORAGE_KEYS.INGREDIENTS, []);
        const idx = items.findIndex(i => i.id === updatedIng.id);
        if (idx !== -1) {
          items[idx] = updatedIng;
          setStored(STORAGE_KEYS.INGREDIENTS, items);
        }
        return { item: updatedIng, movement: res.data.movement };
      }
    } catch (err) {
      console.warn('[InventoryService] Remote adjust stock failed, adjusting locally:', err.message);
      return this.adjustStock({ ingredientId, branchId, newQty, reason, notes, user });
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
      console.warn('[InventoryService] Remote movements failed, using cached store:', err.message);
    }
    return this.getMovements(filter);
  }
};
