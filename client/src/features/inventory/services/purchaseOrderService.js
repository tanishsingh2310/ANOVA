// ============================================================
// ANOVA PURCHASE ORDER & GOODS RECEIVING SERVICE
// Strictly enforces procurement lifecycle & stock integrity:
// 1. PO creation / approval NEVER increases stock.
// 2. ONLY accepted goods upon valid GRN receipt increase stock.
// 3. Duplicate receipt submission protection.
// ============================================================

import { SEED_PURCHASE_ORDERS, SEED_STOCK_MOVEMENTS, SEED_INGREDIENTS } from './mockData.js';
import { apiClient } from '../../../api/client.js';

export function normalizePurchaseOrder(doc) {
  if (!doc) return null;
  const poId = String(doc._id || doc.id);
  const supplierId = String(doc.supplier?._id || doc.supplier || doc.supplierId || '');
  const branchId = doc.branch || doc.branchId;

  const items = (doc.items || []).map(it => ({
    ingredientId: String(it.ingredient?._id || it.ingredient || it.ingredientId),
    ingredientName: it.ingredient?.name || '',
    orderedQty: Number(it.orderedQty || 0),
    receivedQty: Number(it.receivedQty || 0),
    rejectedQty: Number(it.rejectedQty || 0),
    damagedQty: Number(it.damagedQty || 0),
    unit: it.unit || 'kg',
    unitPrice: Number(it.unitPrice || 0)
  }));

  return {
    ...doc,
    id: poId,
    _id: poId,
    poNumber: doc.poNumber,
    supplierId,
    supplier: doc.supplier,
    branchId,
    status: doc.status,
    createdAt: doc.createdAt,
    expectedDate: doc.expectedDate,
    approvedBy: doc.approvedBy,
    approvedAt: doc.approvedAt,
    createdBy: doc.createdBy,
    notes: doc.notes || '',
    items,
    subtotal: Number(doc.subtotal || 0),
    tax: Number(doc.tax || 0),
    totalAmount: Number(doc.totalAmount || 0),
    receiptHistory: doc.receiptHistory || []
  };
}

const PO_KEY = 'anova_inventory_pos';
const MOVEMENTS_KEY = 'anova_inventory_movements';
const INGREDIENTS_KEY = 'anova_inventory_ingredients';

function getPOsData() {
  try {
    const raw = localStorage.getItem(PO_KEY);
    if (!raw) {
      localStorage.setItem(PO_KEY, JSON.stringify(SEED_PURCHASE_ORDERS));
      return SEED_PURCHASE_ORDERS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_PURCHASE_ORDERS;
  }
}

function savePOsData(data) {
  try {
    localStorage.setItem(PO_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving POs:', err);
  }
}

export const PurchaseOrderService = {
  getPurchaseOrders(filter = {}) {
    let orders = getPOsData();
    const { branchId, status, supplierId } = filter;

    if (branchId && branchId !== 'all') {
      orders = orders.filter(po => po.branchId === branchId);
    }
    if (status && status !== 'ALL') {
      orders = orders.filter(po => po.status === status);
    }
    if (supplierId && supplierId !== 'ALL') {
      orders = orders.filter(po => po.supplierId === supplierId);
    }

    return orders;
  },

  getPOById(id) {
    const orders = getPOsData();
    return orders.find(po => po.id === id || po._id === id || po.poNumber === id) || null;
  },

  createPO({ supplierId, branchId, expectedDate, items, notes, createdBy = 'Store Manager' }) {
    if (!items || items.length === 0) throw new Error('At least one line item is required');

    const orders = getPOsData();
    const subtotal = items.reduce((acc, it) => acc + (Number(it.orderedQty) * Number(it.unitPrice)), 0);
    const tax = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
    const totalAmount = subtotal + tax;

    const newPO = {
      id: `po_${Date.now()}`,
      poNumber: `PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      supplierId,
      branchId,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      expectedDate,
      approvedBy: null,
      approvedAt: null,
      createdBy: createdBy || 'Store Manager',
      notes: notes || '',
      items: items.map(it => ({
        ingredientId: it.ingredientId,
        orderedQty: Number(it.orderedQty),
        unit: it.unit || 'kg',
        unitPrice: Number(it.unitPrice),
        receivedQty: 0,
        rejectedQty: 0,
        damagedQty: 0
      })),
      subtotal,
      tax,
      totalAmount,
      receiptHistory: []
    };

    orders.unshift(newPO);
    savePOsData(orders);
    return newPO;
  },

  updateStatus(poId, nextStatus, user = 'Enterprise Admin') {
    const orders = getPOsData();
    const po = orders.find(o => o.id === poId || o._id === poId || o.poNumber === poId);
    if (!po) throw new Error('Purchase Order not found');

    // Valid transitions
    const validTransitions = {
      DRAFT: ['SUBMITTED', 'CANCELLED'],
      SUBMITTED: ['APPROVED', 'CANCELLED'],
      APPROVED: ['ORDERED', 'CANCELLED'],
      ORDERED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
      PARTIALLY_RECEIVED: ['RECEIVED', 'CANCELLED']
    };

    const allowed = validTransitions[po.status] || [];
    if (!allowed.includes(nextStatus)) {
      throw new Error(`Cannot transition PO from ${po.status} to ${nextStatus}`);
    }

    po.status = nextStatus;
    if (nextStatus === 'APPROVED') {
      po.approvedBy = user;
      po.approvedAt = new Date().toISOString();
    }

    savePOsData(orders);
    return po;
  },

  // GOODS RECEIVING NOTE (GRN) — INCREASES STOCK
  receiveGoods({
    poId,
    grnNumber,
    receiverName = 'Receiving Officer',
    receiptItems, // Array of { ingredientId, acceptedQty, rejectedQty, damagedQty, batchNumber, expiryDate, unitCost }
    notes = ''
  }) {
    const orders = getPOsData();
    const po = orders.find(o => o.id === poId || o._id === poId || o.poNumber === poId);
    if (!po) throw new Error('Purchase Order not found');

    if (po.status !== 'ORDERED' && po.status !== 'PARTIALLY_RECEIVED') {
      throw new Error(`Cannot receive goods for PO with status ${po.status}`);
    }

    // Check duplicate GRN
    const generatedGRN = grnNumber || `GRN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const duplicateGRN = (po.receiptHistory || []).some(r => r.grnNumber === generatedGRN);
    if (duplicateGRN) {
      throw new Error(`Duplicate receipt detected: GRN ${generatedGRN} has already been processed.`);
    }

    // Read Ingredients for Stock Update
    let ingredients = [];
    try {
      const raw = localStorage.getItem(INGREDIENTS_KEY);
      ingredients = raw ? JSON.parse(raw) : SEED_INGREDIENTS;
    } catch {
      ingredients = SEED_INGREDIENTS;
    }

    // Read Movements for Audit Log
    let movements = [];
    try {
      const raw = localStorage.getItem(MOVEMENTS_KEY);
      movements = raw ? JSON.parse(raw) : SEED_STOCK_MOVEMENTS;
    } catch {
      movements = SEED_STOCK_MOVEMENTS;
    }

    const receiptRecords = [];

    // Process each line item
    receiptItems.forEach(recItem => {
      const poLine = po.items.find(i => i.ingredientId === recItem.ingredientId);
      if (!poLine) return;

      const accepted = Number(recItem.acceptedQty || 0);
      const rejected = Number(recItem.rejectedQty || 0);
      const damaged = Number(recItem.damagedQty || 0);

      poLine.receivedQty = (poLine.receivedQty || 0) + accepted;
      poLine.rejectedQty = (poLine.rejectedQty || 0) + rejected;
      poLine.damagedQty = (poLine.damagedQty || 0) + damaged;

      // Update Ingredient Stock ONLY with acceptedQty
      if (accepted > 0) {
        const ingIndex = ingredients.findIndex(i => i.id === recItem.ingredientId);
        if (ingIndex !== -1) {
          const ing = ingredients[ingIndex];
          if (!ing.stockByBranch) ing.stockByBranch = {};
          const currentBranchStock = Number(ing.stockByBranch[po.branchId] || 0);
          const newBranchStock = currentBranchStock + accepted;
          ing.stockByBranch[po.branchId] = newBranchStock;

          // Add Batch
          const newBatch = {
            id: `bat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            branchId: po.branchId,
            batchNumber: recItem.batchNumber || `BAT-${Date.now().toString().slice(-4)}`,
            qty: accepted,
            expiryDate: recItem.expiryDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            receivedCost: Number(recItem.unitCost || poLine.unitPrice)
          };
          if (!ing.batches) ing.batches = [];
          ing.batches.push(newBatch);

          // Add Stock Movement Audit
          movements.unshift({
            id: `mov_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            type: 'GOODS_RECEIPT',
            reference: `${generatedGRN} (${po.poNumber})`,
            ingredientId: ing.id,
            branchId: po.branchId,
            deltaQty: +accepted,
            unit: ing.baseUnit,
            resultingBalance: newBranchStock,
            performedBy: receiverName,
            timestamp: new Date().toISOString(),
            notes: `Batch ${newBatch.batchNumber} received. Rejected: ${rejected}, Damaged: ${damaged}. ${notes}`
          });
        }
      }

      receiptRecords.push({
        ingredientId: recItem.ingredientId,
        acceptedQty: accepted,
        rejectedQty: rejected,
        damagedQty: damaged,
        batchNumber: recItem.batchNumber,
        expiryDate: recItem.expiryDate
      });
    });

    // Determine new PO status (All items fully received?)
    const allCompleted = po.items.every(i => (i.receivedQty + i.rejectedQty + i.damagedQty) >= i.orderedQty);
    po.status = allCompleted ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

    po.receiptHistory.unshift({
      grnNumber: generatedGRN,
      receivedAt: new Date().toISOString(),
      receivedBy: receiverName,
      items: receiptRecords,
      notes
    });

    // Save all stores atomically
    savePOsData(orders);
    localStorage.setItem(INGREDIENTS_KEY, JSON.stringify(ingredients));
    localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements));

    return { po, grnNumber: generatedGRN };
  },

  // ==========================================
  // REMOTE BACKEND / ATLAS SYNCHRONIZATION
  // ==========================================
  async syncFromBackend(branchId = 'all') {
    try {
      const branchQuery = branchId && branchId !== 'all' ? `?branch=${branchId}` : '';
      const res = await apiClient(`/api/inventory/purchase-orders${branchQuery}`);
      if (res && res.success && Array.isArray(res.data)) {
        const remotePOs = res.data.map(normalizePurchaseOrder);
        const localPOs = getPOsData();

        // Merge: remote POs take precedence, but preserve local-only POs (e.g., drafts or local offline POs)
        const remoteMap = new Map();
        remotePOs.forEach(r => {
          remoteMap.set(r.id, r);
          if (r.poNumber) remoteMap.set(r.poNumber, r);
        });

        const merged = [...remotePOs];
        localPOs.forEach(local => {
          const matchKey1 = local.id;
          const matchKey2 = local.poNumber;
          const matchKey3 = local._id;
          if (!remoteMap.has(matchKey1) && !remoteMap.has(matchKey2) && (!matchKey3 || !remoteMap.has(matchKey3))) {
            merged.push(local);
          }
        });

        savePOsData(merged);
        return this.getPurchaseOrders({ branchId });
      }
    } catch (err) {
      console.warn('[PurchaseOrderService] Backend sync failed, using cached store:', err.message);
    }
    return this.getPurchaseOrders({ branchId });
  },

  async createPORemote({ supplierId, branchId, expectedDate, items, notes, createdBy = 'Store Manager' }) {
    const payload = {
      supplier: supplierId,
      branch: branchId,
      expectedDate,
      expectedDeliveryDate: expectedDate,
      notes,
      createdBy,
      items: items.map(it => ({
        ingredient: it.ingredientId,
        orderedQty: Number(it.orderedQty),
        unit: it.unit || 'kg',
        unitPrice: Number(it.unitPrice)
      }))
    };

    try {
      const res = await apiClient('/api/inventory/purchase-orders', {
        method: 'POST',
        body: payload
      });
      if (res && res.success && res.data) {
        const normalized = normalizePurchaseOrder(res.data);
        const orders = getPOsData();
        orders.unshift(normalized);
        savePOsData(orders);
        return normalized;
      }
    } catch (err) {
      console.warn('[PurchaseOrderService] Remote PO creation failed, falling back:', err.message);
    }
    return this.createPO({ supplierId, branchId, expectedDate, items, notes, createdBy });
  },

  async updateStatusRemote(poId, nextStatus, user = 'Enterprise Admin') {
    // 1. Always update local store immediately for instant UI response and persistence
    let updatedLocal = null;
    try {
      updatedLocal = this.updateStatus(poId, nextStatus, user);
    } catch (localErr) {
      console.warn('[PurchaseOrderService] Local status update pre-check note:', localErr.message);
    }

    // 2. Determine best ID for remote lookup
    const lookupId = updatedLocal?._id || updatedLocal?.poNumber || poId;

    try {
      let res;
      if (nextStatus === 'APPROVED') {
        res = await apiClient(`/api/inventory/purchase-orders/${lookupId}/approve`, {
          method: 'PATCH',
          body: { approvedBy: user }
        });
      } else {
        res = await apiClient(`/api/inventory/purchase-orders/${lookupId}/status`, {
          method: 'PATCH',
          body: { status: nextStatus, approvedBy: user }
        });
      }

      if (res && res.success && res.data) {
        const normalized = normalizePurchaseOrder(res.data);
        const orders = getPOsData();
        const idx = orders.findIndex(o => o.id === normalized.id || o.poNumber === normalized.poNumber || o._id === normalized.id);
        if (idx !== -1) {
          orders[idx] = normalized;
        } else {
          orders.unshift(normalized);
        }
        savePOsData(orders);
        return normalized;
      }
    } catch (err) {
      console.warn('[PurchaseOrderService] Remote status update failed, keeping local update:', err.message);
    }

    if (updatedLocal) return updatedLocal;
    return this.updateStatus(poId, nextStatus, user);
  },

  async receiveGoodsRemote({ poId, grnNumber, receiverName = 'Receiving Officer', receiptItems, notes = '' }) {
    const orders = getPOsData();
    const existing = orders.find(o => o.id === poId || o._id === poId || o.poNumber === poId);
    const lookupId = existing?._id || existing?.poNumber || poId;

    const payload = {
      grnNumber,
      receiverName,
      notes,
      items: receiptItems.map(it => ({
        ingredient: it.ingredientId,
        acceptedQty: Number(it.acceptedQty || 0),
        rejectedQty: Number(it.rejectedQty || 0),
        damagedQty: Number(it.damagedQty || 0),
        batchNumber: it.batchNumber,
        expiryDate: it.expiryDate
      }))
    };

    try {
      const res = await apiClient(`/api/inventory/purchase-orders/${lookupId}/receive`, {
        method: 'POST',
        body: payload
      });

      if (res && res.success && res.data) {
        const normalized = normalizePurchaseOrder(res.data);
        const list = getPOsData();
        const idx = list.findIndex(o => o.id === normalized.id || o.poNumber === normalized.poNumber || o._id === normalized.id);
        if (idx !== -1) {
          list[idx] = normalized;
        } else {
          list.unshift(normalized);
        }
        savePOsData(list);
        return { po: normalized, grnNumber };
      }
    } catch (err) {
      console.warn('[PurchaseOrderService] Remote GRN receive failed, falling back:', err.message);
    }
    return this.receiveGoods({ poId, grnNumber, receiverName, receiptItems, notes });
  }
};
