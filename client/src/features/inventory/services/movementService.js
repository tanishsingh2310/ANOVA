// ============================================================
// ANOVA STOCK MOVEMENT, TRANSFERS & WASTAGE SERVICE
// Enforces:
// 1. Double-count prevention for inter-branch transfers (In-Transit isolation)
// 2. Insufficient stock deduction prevention
// 3. Batch-level and cost-accurate wastage logging
// ============================================================

import { SEED_TRANSFERS, SEED_WASTAGE, SEED_STOCK_MOVEMENTS, SEED_INGREDIENTS } from './mockData.js';
import { apiClient } from '../../../api/client.js';

export function normalizeTransfer(doc) {
  if (!doc) return null;
  const tId = String(doc._id || doc.id);
  const items = (doc.items || []).map(it => ({
    ingredientId: String(it.ingredient?._id || it.ingredient || it.ingredientId),
    ingredientName: it.ingredient?.name || '',
    qty: Number(it.qty || 0),
    unit: it.unit || 'kg',
    unitCost: Number(it.unitCost || 0)
  }));

  return {
    ...doc,
    id: tId,
    _id: tId,
    transferNumber: doc.transferNumber,
    fromBranchId: doc.fromBranch || doc.fromBranchId,
    toBranchId: doc.toBranch || doc.toBranchId,
    status: doc.status,
    items,
    dispatchedBy: doc.dispatchedBy,
    receivedBy: doc.receivedBy,
    dispatchedAt: doc.dispatchedAt || doc.createdAt,
    receivedAt: doc.receivedAt,
    notes: doc.notes || ''
  };
}

export function normalizeWastage(doc) {
  if (!doc) return null;
  const wId = String(doc._id || doc.id);
  return {
    ...doc,
    id: wId,
    _id: wId,
    wasteNumber: doc.wasteNumber,
    branchId: doc.branch || doc.branchId,
    ingredientId: String(doc.ingredient?._id || doc.ingredient || doc.ingredientId),
    ingredientName: doc.ingredient?.name || '',
    batchNumber: doc.batchNumber,
    qty: Number(doc.quantity !== undefined ? doc.quantity : (doc.qty || 0)),
    unit: doc.unit || 'kg',
    unitCost: Number(doc.unitCost || 0),
    totalCost: Number(doc.totalCost || 0),
    reason: doc.reason,
    loggedBy: doc.loggedBy,
    date: doc.date || doc.createdAt,
    notes: doc.notes || ''
  };
}

const TRANSFERS_KEY = 'anova_inventory_transfers';
const WASTAGE_KEY = 'anova_inventory_wastage';
const INGREDIENTS_KEY = 'anova_inventory_ingredients';
const MOVEMENTS_KEY = 'anova_inventory_movements';

function getTransfersData() {
  try {
    const raw = localStorage.getItem(TRANSFERS_KEY);
    if (!raw) {
      localStorage.setItem(TRANSFERS_KEY, JSON.stringify(SEED_TRANSFERS));
      return SEED_TRANSFERS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_TRANSFERS;
  }
}

function saveTransfersData(data) {
  try {
    localStorage.setItem(TRANSFERS_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving transfers:', err);
  }
}

function getWastageData() {
  try {
    const raw = localStorage.getItem(WASTAGE_KEY);
    if (!raw) {
      localStorage.setItem(WASTAGE_KEY, JSON.stringify(SEED_WASTAGE));
      return SEED_WASTAGE;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_WASTAGE;
  }
}

function saveWastageData(data) {
  try {
    localStorage.setItem(WASTAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving wastage:', err);
  }
}

export const MovementService = {
  // Transfers
  getTransfers(filter = {}) {
    let transfers = getTransfersData();
    const { branchId, status } = filter;

    if (branchId && branchId !== 'all') {
      transfers = transfers.filter(t => t.fromBranchId === branchId || t.toBranchId === branchId);
    }
    if (status && status !== 'ALL') {
      transfers = transfers.filter(t => t.status === status);
    }

    return transfers;
  },

  dispatchTransfer({ fromBranchId, toBranchId, items, notes, dispatchedBy = 'Dispatcher' }) {
    if (fromBranchId === toBranchId) throw new Error('Source and destination branches cannot be the same');
    if (!items || items.length === 0) throw new Error('At least one item must be transferred');

    // Read Ingredients & Movements
    let ingredients = [];
    try {
      const raw = localStorage.getItem(INGREDIENTS_KEY);
      ingredients = raw ? JSON.parse(raw) : SEED_INGREDIENTS;
    } catch {
      ingredients = SEED_INGREDIENTS;
    }

    let movements = [];
    try {
      const raw = localStorage.getItem(MOVEMENTS_KEY);
      movements = raw ? JSON.parse(raw) : SEED_STOCK_MOVEMENTS;
    } catch {
      movements = SEED_STOCK_MOVEMENTS;
    }

    const transferNumber = `TR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    // Verify stock availability at source branch
    items.forEach(it => {
      const ing = ingredients.find(i => i.id === it.ingredientId);
      if (!ing) throw new Error(`Ingredient ${it.ingredientId} not found`);
      const available = Number(ing.stockByBranch?.[fromBranchId] || 0);
      if (available < Number(it.qty)) {
        throw new Error(`Insufficient stock for ${ing.name} at source branch. Available: ${available} ${ing.baseUnit}, Requested: ${it.qty}`);
      }
    });

    // Deduct stock from source branch immediately (In-Transit)
    items.forEach(it => {
      const ing = ingredients.find(i => i.id === it.ingredientId);
      const current = Number(ing.stockByBranch[fromBranchId]);
      const newStock = current - Number(it.qty);
      ing.stockByBranch[fromBranchId] = newStock;

      // Deplete batches via FIFO from source branch
      if (ing.batches) {
        let remaining = Number(it.qty);
        if (it.batchNumber && it.batchNumber !== 'TR-BATCH') {
          const target = ing.batches.find(b => (b.branchId === fromBranchId || b.branch === fromBranchId) && b.batchNumber === it.batchNumber && ((b.qty !== undefined ? b.qty : b.quantity) > 0));
          if (target) {
            const bQty = target.qty !== undefined ? target.qty : target.quantity;
            const take = Math.min(bQty, remaining);
            if (target.qty !== undefined) target.qty -= take;
            if (target.quantity !== undefined) target.quantity -= take;
            remaining -= take;
          }
        }
        if (remaining > 0) {
          const branchBatches = ing.batches
            .filter(b => (b.branchId === fromBranchId || b.branch === fromBranchId) && ((b.qty !== undefined ? b.qty : b.quantity) > 0))
            .sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0));
          for (const b of branchBatches) {
            if (remaining <= 0) break;
            const bQty = b.qty !== undefined ? b.qty : b.quantity;
            const take = Math.min(bQty, remaining);
            if (b.qty !== undefined) b.qty -= take;
            if (b.quantity !== undefined) b.quantity -= take;
            remaining -= take;
          }
        }
      }

      movements.unshift({
        id: `mov_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        type: 'TRANSFER_DISPATCH',
        reference: transferNumber,
        ingredientId: ing.id,
        branchId: fromBranchId,
        deltaQty: -Number(it.qty),
        unit: ing.baseUnit,
        resultingBalance: newStock,
        performedBy: dispatchedBy,
        timestamp: new Date().toISOString(),
        notes: `Dispatched to destination branch. Transfer ${transferNumber}`
      });
    });

    const newTransfer = {
      id: `tr_${Date.now()}`,
      transferNumber,
      fromBranchId,
      toBranchId,
      status: 'IN_TRANSIT',
      dispatchedAt: new Date().toISOString(),
      dispatchedBy,
      receivedAt: null,
      receivedBy: null,
      items: items.map(it => ({
        ingredientId: it.ingredientId,
        qty: Number(it.qty),
        unit: it.unit || 'kg',
        unitCost: Number(it.unitCost || 0),
        batchNumber: it.batchNumber || 'TR-BATCH'
      })),
      notes: notes || ''
    };

    const transfers = getTransfersData();
    transfers.unshift(newTransfer);

    saveTransfersData(transfers);
    localStorage.setItem(INGREDIENTS_KEY, JSON.stringify(ingredients));
    localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements));

    return newTransfer;
  },

  receiveTransfer({ transferId, receivedBy = 'Receiving Manager' }) {
    const transfers = getTransfersData();
    const transfer = transfers.find(t => t.id === transferId);
    if (!transfer) throw new Error('Transfer record not found');
    if (transfer.status !== 'IN_TRANSIT') {
      throw new Error(`Cannot receive transfer with status ${transfer.status}`);
    }

    // Read Ingredients & Movements
    let ingredients = [];
    try {
      const raw = localStorage.getItem(INGREDIENTS_KEY);
      ingredients = raw ? JSON.parse(raw) : SEED_INGREDIENTS;
    } catch {
      ingredients = SEED_INGREDIENTS;
    }

    let movements = [];
    try {
      const raw = localStorage.getItem(MOVEMENTS_KEY);
      movements = raw ? JSON.parse(raw) : SEED_STOCK_MOVEMENTS;
    } catch {
      movements = SEED_STOCK_MOVEMENTS;
    }

    // Add stock to destination branch
    transfer.items.forEach(it => {
      const ing = ingredients.find(i => i.id === it.ingredientId);
      if (ing) {
        if (!ing.stockByBranch) ing.stockByBranch = {};
        const destStock = Number(ing.stockByBranch[transfer.toBranchId] || 0);
        const newStock = destStock + Number(it.qty);
        ing.stockByBranch[transfer.toBranchId] = newStock;

        // Add batch for destination
        if (!ing.batches) ing.batches = [];
        ing.batches.push({
          id: `bat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          branchId: transfer.toBranchId,
          batchNumber: it.batchNumber,
          qty: Number(it.qty),
          expiryDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
          receivedCost: it.unitCost
        });

        movements.unshift({
          id: `mov_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          type: 'TRANSFER_RECEIVE',
          reference: transfer.transferNumber,
          ingredientId: ing.id,
          branchId: transfer.toBranchId,
          deltaQty: +Number(it.qty),
          unit: ing.baseUnit,
          resultingBalance: newStock,
          performedBy: receivedBy,
          timestamp: new Date().toISOString(),
          notes: `Received from branch ${transfer.fromBranchId}. Transfer ${transfer.transferNumber}`
        });
      }
    });

    transfer.status = 'RECEIVED';
    transfer.receivedAt = new Date().toISOString();
    transfer.receivedBy = receivedBy;

    saveTransfersData(transfers);
    localStorage.setItem(INGREDIENTS_KEY, JSON.stringify(ingredients));
    localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements));

    return transfer;
  },

  // Wastage Management
  getWastage(filter = {}) {
    let list = getWastageData();
    const { branchId, reason } = filter;

    if (branchId && branchId !== 'all') {
      list = list.filter(w => w.branchId === branchId);
    }
    if (reason && reason !== 'ALL') {
      list = list.filter(w => w.reason === reason);
    }

    return list;
  },

  logWastage({ branchId, ingredientId, batchNumber, qty, reason, notes, loggedBy = 'Kitchen Staff' }) {
    const deductQty = Number(qty);
    if (deductQty <= 0) throw new Error('Wastage quantity must be greater than zero');

    // Read Ingredients & Movements
    let ingredients;
    try {
      const raw = localStorage.getItem(INGREDIENTS_KEY);
      ingredients = raw ? JSON.parse(raw) : SEED_INGREDIENTS;
    } catch {
      ingredients = SEED_INGREDIENTS;
    }

    let movements;
    try {
      const raw = localStorage.getItem(MOVEMENTS_KEY);
      movements = raw ? JSON.parse(raw) : SEED_STOCK_MOVEMENTS;
    } catch {
      movements = SEED_STOCK_MOVEMENTS;
    }

    const ing = ingredients.find(i => i.id === ingredientId);
    if (!ing) throw new Error('Ingredient not found');

    const currentStock = Number(ing.stockByBranch?.[branchId] || 0);
    if (currentStock < deductQty) {
      throw new Error(`Cannot write off ${deductQty} ${ing.baseUnit}. Only ${currentStock} available in branch.`);
    }

    const newStock = currentStock - deductQty;
    ing.stockByBranch[branchId] = newStock;

    // Deduct from batches via FIFO (prioritizing specific batch if passed)
    if (ing.batches) {
      let remaining = deductQty;
      if (batchNumber && batchNumber !== 'GENERAL-STOCK') {
        const batch = ing.batches.find(b => (b.branchId === branchId || b.branch === branchId) && b.batchNumber === batchNumber && ((b.qty !== undefined ? b.qty : b.quantity) > 0));
        if (batch) {
          const bQty = batch.qty !== undefined ? batch.qty : batch.quantity;
          const take = Math.min(bQty, remaining);
          if (batch.qty !== undefined) batch.qty -= take;
          if (batch.quantity !== undefined) batch.quantity -= take;
          remaining -= take;
        }
      }
      if (remaining > 0) {
        const branchBatches = ing.batches
          .filter(b => (b.branchId === branchId || b.branch === branchId) && ((b.qty !== undefined ? b.qty : b.quantity) > 0))
          .sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0));
        for (const b of branchBatches) {
          if (remaining <= 0) break;
          const bQty = b.qty !== undefined ? b.qty : b.quantity;
          const take = Math.min(bQty, remaining);
          if (b.qty !== undefined) b.qty -= take;
          if (b.quantity !== undefined) b.quantity -= take;
          remaining -= take;
        }
      }
    }

    const unitCost = Number(ing.unitCost || 0);
    const totalCost = Math.round(unitCost * deductQty * 100) / 100;
    const wasteNumber = `WST-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newWastage = {
      id: `wst_${Date.now()}`,
      wasteNumber,
      branchId,
      ingredientId,
      batchNumber: batchNumber || 'GENERAL-STOCK',
      qty: deductQty,
      unit: ing.baseUnit,
      unitCost,
      totalCost,
      reason,
      loggedBy,
      date: new Date().toISOString(),
      notes: notes || ''
    };

    const wastageList = getWastageData();
    wastageList.unshift(newWastage);

    movements.unshift({
      id: `mov_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: 'WASTAGE_DEDUCTION',
      reference: wasteNumber,
      ingredientId: ing.id,
      branchId,
      deltaQty: -deductQty,
      unit: ing.baseUnit,
      resultingBalance: newStock,
      performedBy: loggedBy,
      timestamp: new Date().toISOString(),
      notes: `Reason: ${reason}. Cost Impact: ₹${totalCost}. ${notes}`
    });

    saveWastageData(wastageList);
    localStorage.setItem(INGREDIENTS_KEY, JSON.stringify(ingredients));
    localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements));

    return newWastage;
  },

  // ==========================================
  // REMOTE BACKEND / ATLAS SYNCHRONIZATION
  // ==========================================
  async syncTransfersFromBackend(branchId = 'all') {
    try {
      const branchQuery = branchId && branchId !== 'all' ? `?branch=${branchId}` : '';
      const res = await apiClient(`/api/inventory/transfers${branchQuery}`);
      if (res && res.success && Array.isArray(res.data)) {
        const normalized = res.data.map(normalizeTransfer);
        saveTransfersData(normalized);
        return normalized;
      }
    } catch (err) {
      console.warn('[MovementService] Backend transfers sync failed, using cached store:', err.message);
    }
    return this.getTransfers({ branchId });
  },

  async dispatchTransferRemote({ fromBranchId, toBranchId, items, notes, dispatchedBy = 'Dispatcher' }) {
    const payload = {
      fromBranch: fromBranchId,
      toBranch: toBranchId,
      notes,
      dispatchedBy,
      items: items.map(it => ({
        ingredient: it.ingredientId,
        qty: Number(it.qty),
        unit: it.unit || 'kg',
        unitCost: Number(it.unitCost || 0)
      }))
    };

    try {
      const res = await apiClient('/api/inventory/transfers/dispatch', {
        method: 'POST',
        body: payload
      });
      if (res && res.success && res.data) {
        const normalized = normalizeTransfer(res.data);
        const list = getTransfersData();
        list.unshift(normalized);
        saveTransfersData(list);
        return normalized;
      }
    } catch (err) {
      console.warn('[MovementService] Remote transfer dispatch failed, falling back:', err.message);
    }
    return this.dispatchTransfer({ fromBranchId, toBranchId, items, notes, dispatchedBy });
  },

  async receiveTransferRemote({ transferId, receivedBy = 'Receiver' }) {
    try {
      const res = await apiClient(`/api/inventory/transfers/${transferId}/receive`, {
        method: 'POST',
        body: { receivedBy }
      });
      if (res && res.success && res.data) {
        const normalized = normalizeTransfer(res.data);
        const list = getTransfersData();
        const idx = list.findIndex(t => t.id === normalized.id);
        if (idx !== -1) {
          list[idx] = normalized;
          saveTransfersData(list);
        }
        return normalized;
      }
    } catch (err) {
      console.warn('[MovementService] Remote transfer receive failed, falling back:', err.message);
    }
    return this.receiveTransfer({ transferId, receivedBy });
  },

  async syncWastageFromBackend(branchId = 'all') {
    try {
      const branchQuery = branchId && branchId !== 'all' ? `?branch=${branchId}` : '';
      const res = await apiClient(`/api/inventory/wastage${branchQuery}`);
      if (res && res.success && Array.isArray(res.data)) {
        const normalized = res.data.map(normalizeWastage);
        saveWastageData(normalized);
        return normalized;
      }
    } catch (err) {
      console.warn('[MovementService] Backend wastage sync failed, using cached store:', err.message);
    }
    return this.getWastage({ branchId });
  },

  async logWastageRemote({ branchId, ingredientId, batchNumber, qty, reason, notes, loggedBy = 'Kitchen Staff' }) {
    const payload = {
      branch: branchId,
      ingredient: ingredientId,
      batchNumber,
      quantity: Number(qty),
      reason,
      notes,
      loggedBy
    };

    try {
      const res = await apiClient('/api/inventory/wastage', {
        method: 'POST',
        body: payload
      });
      if (res && res.success && res.data) {
        const normalized = normalizeWastage(res.data);
        const list = getWastageData();
        list.unshift(normalized);
        saveWastageData(list);
        return normalized;
      }
    } catch (err) {
      console.warn('[MovementService] Remote wastage logging failed, falling back:', err.message);
    }
    return this.logWastage({ branchId, ingredientId, batchNumber, qty, reason, notes, loggedBy });
  }
};
