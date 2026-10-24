// ============================================================
// ANOVA STOCK MOVEMENT, TRANSFERS & WASTAGE SERVICE
// Enforces:
// 1. Double-count prevention for inter-branch transfers (In-Transit isolation)
// 2. Insufficient stock deduction prevention
// 3. Batch-level and cost-accurate wastage logging
// ============================================================

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
  const wId = String(doc._id || doc.id || '');
  const ingObj = (typeof doc.ingredient === 'object' && doc.ingredient !== null) ? doc.ingredient : null;
  const ingId = String(ingObj?._id || ingObj?.id || (typeof doc.ingredient === 'string' ? doc.ingredient : '') || doc.ingredientId || '');
  const ingName = ingObj?.name || doc.ingredientName || doc.name || '';
  return {
    ...doc,
    id: wId,
    _id: wId,
    wasteNumber: doc.wasteNumber || `WST-${wId ? wId.slice(-6).toUpperCase() : Math.floor(Math.random() * 10000)}`,
    branchId: typeof doc.branch === 'object' && doc.branch !== null ? String(doc.branch._id || doc.branch.id || doc.branch.code || '') : String(doc.branch || doc.branchId || ''),
    ingredientId: ingId,
    ingredientName: ingName,
    batchNumber: doc.batchNumber || '',
    qty: Number(doc.quantity !== undefined ? doc.quantity : (doc.qty || 0)),
    unit: doc.unit || ingObj?.baseUnit || 'kg',
    unitCost: Number(doc.unitCost || 0),
    totalCost: Number(doc.totalCost || 0),
    reason: doc.reason || 'EXPIRED',
    loggedBy: doc.loggedBy || 'Kitchen Staff',
    date: doc.date || doc.createdAt || new Date().toISOString(),
    notes: doc.notes || ''
  };
}

const TRANSFERS_KEY = 'anova_inventory_transfers';
const WASTAGE_KEY = 'anova_inventory_wastage';
const INGREDIENTS_KEY = 'anova_inventory_ingredients';
const MOVEMENTS_KEY = 'anova_inventory_movements';

const MOCK_TRANSFER_REGEX = /^(tr)_\d{2,3}$/;
const MOCK_WASTAGE_REGEX = /^(wst)_\d{2,3}$/;

function getTransfersData() {
  try {
    const raw = localStorage.getItem(TRANSFERS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const clean = parsed.filter(t => {
        const id = String(t?.id || t?._id || '');
        return !MOCK_TRANSFER_REGEX.test(id);
      });
      if (clean.length !== parsed.length) {
        localStorage.setItem(TRANSFERS_KEY, JSON.stringify(clean));
      }
      return clean;
    }
    localStorage.removeItem(TRANSFERS_KEY);
    return [];
  } catch {
    return [];
  }
}

function saveTransfersData(data) {
  try {
    localStorage.setItem(TRANSFERS_KEY, JSON.stringify(Array.isArray(data) ? data : []));
  } catch (err) {
    console.error('Error saving transfers:', err);
  }
}

function getWastageData() {
  try {
    const raw = localStorage.getItem(WASTAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const clean = parsed.filter(w => {
        const id = String(w?.id || w?._id || '');
        return !MOCK_WASTAGE_REGEX.test(id);
      });
      if (clean.length !== parsed.length) {
        localStorage.setItem(WASTAGE_KEY, JSON.stringify(clean));
      }
      return clean;
    }
    // If corrupted or single object, clean localStorage and return empty array
    localStorage.removeItem(WASTAGE_KEY);
    return [];
  } catch {
    return [];
  }
}

function saveWastageData(data) {
  try {
    localStorage.setItem(WASTAGE_KEY, JSON.stringify(Array.isArray(data) ? data : []));
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

    let ingredients = [];
    try {
      const raw = localStorage.getItem(INGREDIENTS_KEY);
      ingredients = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(ingredients)) ingredients = [];
    } catch {
      ingredients = [];
    }

    let movements = [];
    try {
      const raw = localStorage.getItem(MOVEMENTS_KEY);
      movements = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(movements)) movements = [];
    } catch {
      movements = [];
    }

    const transferNumber = `TR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    items.forEach(it => {
      const ing = ingredients.find(i => i.id === it.ingredientId);
      if (!ing) throw new Error(`Ingredient ${it.ingredientId} not found`);
      const available = Number(ing.stockByBranch?.[fromBranchId] || 0);
      if (available < Number(it.qty)) {
        throw new Error(`Insufficient stock for ${ing.name} at source branch. Available: ${available} ${ing.baseUnit}, Requested: ${it.qty}`);
      }
    });

    items.forEach(it => {
      const ing = ingredients.find(i => i.id === it.ingredientId);
      const current = Number(ing.stockByBranch[fromBranchId] || 0);
      const newStock = Math.max(0, current - Number(it.qty));
      ing.stockByBranch[fromBranchId] = newStock;

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
      id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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

  deleteTransfer(id) {
    const list = getTransfersData();
    const filtered = list.filter(t => t.id !== id && t._id !== id);
    saveTransfersData(filtered);
    return true;
  },

  receiveTransfer({ transferId, receivedBy = 'Receiving Manager' }) {
    const transfers = getTransfersData();
    const transfer = transfers.find(t => t.id === transferId);
    if (!transfer) throw new Error('Transfer record not found');
    if (transfer.status !== 'IN_TRANSIT') {
      throw new Error(`Cannot receive transfer with status ${transfer.status}`);
    }

    let ingredients = [];
    try {
      const raw = localStorage.getItem(INGREDIENTS_KEY);
      ingredients = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(ingredients)) ingredients = [];
    } catch {
      ingredients = [];
    }

    let movements = [];
    try {
      const raw = localStorage.getItem(MOVEMENTS_KEY);
      movements = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(movements)) movements = [];
    } catch {
      movements = [];
    }

    transfer.items.forEach(it => {
      const ing = ingredients.find(i => i.id === it.ingredientId);
      if (ing) {
        if (!ing.stockByBranch) ing.stockByBranch = {};
        const destStock = Number(ing.stockByBranch[transfer.toBranchId] || 0);
        const newStock = destStock + Number(it.qty);
        ing.stockByBranch[transfer.toBranchId] = newStock;

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
    if (!Array.isArray(list)) list = [];
    const { branchId, reason } = filter;

    if (branchId && branchId !== 'all') {
      list = list.filter(w => w && (w.branchId === branchId || w.branch === branchId));
    }
    if (reason && reason !== 'ALL') {
      list = list.filter(w => w && w.reason === reason);
    }

    return list;
  },

  logWastage({ branchId, ingredientId, batchNumber, qty, reason, notes, loggedBy = 'Kitchen Staff' }) {
    const deductQty = Number(qty);
    if (deductQty <= 0) throw new Error('Wastage quantity must be greater than zero');

    let ingredients = [];
    try {
      const raw = localStorage.getItem(INGREDIENTS_KEY);
      ingredients = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(ingredients)) ingredients = [];
    } catch {
      ingredients = [];
    }

    let movements = [];
    try {
      const raw = localStorage.getItem(MOVEMENTS_KEY);
      movements = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(movements)) movements = [];
    } catch {
      movements = [];
    }

    const ing = ingredients.find(i => i.id === ingredientId);
    if (!ing) throw new Error('Ingredient not found');

    const currentStock = Number(ing.stockByBranch?.[branchId] || 0);
    if (currentStock < deductQty) {
      throw new Error(`Cannot write off ${deductQty} ${ing.baseUnit}. Only ${currentStock} available in branch.`);
    }

    const newStock = Math.max(0, currentStock - deductQty);
    ing.stockByBranch[branchId] = newStock;

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
      id: `wst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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

  deleteWastage(id) {
    const list = getWastageData();
    const filtered = list.filter(w => w.id !== id && w._id !== id);
    saveWastageData(filtered);
    return true;
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
        unitCost: Number(it.unitCost || 0),
        batchNumber: it.batchNumber || undefined
      }))
    };

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
    throw new Error(res?.message || 'Failed to dispatch transfer in database');
  },

  async deleteTransferRemote(id) {
    try {
      await apiClient(`/api/inventory/transfers/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Backend transfer delete note:', err.message);
    }
    return this.deleteTransfer(id);
  },

  async receiveTransferRemote({ transferId, receivedBy = 'Receiver' }) {
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
    throw new Error(res?.message || 'Failed to receive transfer in database');
  },

  async syncWastageFromBackend(branchId = 'all') {
    try {
      const branchQuery = branchId && branchId !== 'all' ? `?branch=${branchId}` : '';
      const res = await apiClient(`/api/inventory/wastage${branchQuery}`);
      if (res && res.success && Array.isArray(res.data)) {
        const normalized = res.data.map(normalizeWastage).filter(Boolean);
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
    throw new Error(res?.message || 'Failed to record wastage in database');
  },

  async deleteWastageRemote(id) {
    await apiClient(`/api/inventory/wastage/${id}`, { method: 'DELETE' });
    return this.deleteWastage(id);
  }
};
