// ============================================================
// ANOVA INVENTORY ANALYTICS & VALUATION SERVICE
// Supports:
// 1. Executive Dashboard KPIs
// 2. FIFO & Weighted Average Inventory Valuation
// 3. Multi-branch comparison metrics
// 4. CSV Export generation
// ============================================================

import { InventoryService } from './inventoryService.js';
import { PurchaseOrderService } from './purchaseOrderService.js';
import { MovementService } from './movementService.js';
import { apiClient } from '../../../api/client.js';

export const AnalyticsService = {
  getDashboardKPIs(branchId = 'all', branches = []) {
    const ingredients = Array.isArray(InventoryService.getIngredients()) ? InventoryService.getIngredients() : [];
    const purchaseOrders = PurchaseOrderService.getPurchaseOrders({ branchId }, branches);
    const transfers = MovementService.getTransfers({ branchId }, branches);
    const wastage = Array.isArray(MovementService.getWastage({ branchId })) ? MovementService.getWastage({ branchId }) : [];
    const expiringBatches = InventoryService.getExpiringBatches(7, branchId);

    // Stock calculations
    let totalStockValue = 0;
    let criticalLowCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalItemsTracked = ingredients.length;

    ingredients.forEach(ing => {
      const status = InventoryService.calculateStockStatus(ing, branchId, branches);
      if (status.level === 'OUT_OF_STOCK') outOfStockCount++;
      else if (status.level === 'CRITICAL') criticalLowCount++;
      else if (status.level === 'LOW_STOCK') lowStockCount++;

      const qty = status.qty;
      const unitCost = Number(ing.unitCost || 0);
      totalStockValue += (qty * unitCost);
    });

    // PO Stats
    const pendingApprovalPOs = purchaseOrders.filter(po => po.status === 'SUBMITTED').length;
    const activeOrderedPOs = purchaseOrders.filter(po => po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED').length;

    // Transfer Stats
    const inTransitTransfers = transfers.filter(t => t.status === 'IN_TRANSIT').length;

    // Wastage Stats
    const totalWastageCost = (Array.isArray(wastage) ? wastage : []).reduce((sum, w) => sum + (Number(w?.totalCost) || 0), 0);

    return {
      totalStockValue: Math.round(totalStockValue),
      totalItemsTracked,
      outOfStockCount,
      criticalLowCount,
      lowStockCount,
      totalAlerts: criticalLowCount + lowStockCount + outOfStockCount + expiringBatches.length,
      expiringBatchesCount: expiringBatches.length,
      pendingApprovalPOs,
      activeOrderedPOs,
      inTransitTransfers,
      totalWastageCost: Math.round(totalWastageCost)
    };
  },

  // Valuation Model (FIFO vs Weighted Average)
  getInventoryValuation(branchId = 'all', method = 'FIFO', branches = []) {
    const ingredients = Array.isArray(InventoryService.getIngredients()) ? InventoryService.getIngredients() : [];
    const branchList = Array.isArray(branches) && branches.length > 0 ? branches : InventoryService.getBranches();

    const reportRows = ingredients.map(ing => {
      let branchQty = 0;
      if (branchId === 'all') {
        branchQty = Object.values(ing.stockByBranch || {}).reduce((s, v) => s + (Number(v) || 0), 0);
      } else {
        const stockMap = ing.stockByBranch || {};
        const bObj = branchList.find(b => b.id === branchId || b._id === branchId || b.code === branchId);
        const candidates = [branchId, bObj?.code, bObj?.id, bObj?._id].filter(Boolean);
        let found = false;
        for (const k of candidates) {
          if (stockMap[k] !== undefined) {
            branchQty = Number(stockMap[k] || 0);
            found = true;
            break;
          }
        }
        if (!found) {
          branchQty = Number(stockMap[branchId] || 0);
        }
      }

      const standardCost = Number(ing.unitCost || 0);
      let calculatedUnitCost = standardCost;
      let totalValue = 0;

      const bObj = branchList.find(b => b.id === branchId || b._id === branchId || b.code === branchId);
      const candidates = [branchId, bObj?.code, bObj?.id, bObj?._id].filter(Boolean);

      const relevantBatches = (ing.batches || []).filter(b => {
        const bQty = Number(b.qty !== undefined ? b.qty : (b.quantity || 0));
        if (bQty <= 0) return false;
        if (branchId === 'all') return true;
        const bBranch = String(b.branchId || b.branch || b.branchRef || '');
        return candidates.some(c => String(c).toLowerCase() === bBranch.toLowerCase());
      });

      if (relevantBatches.length > 0) {
        if (method === 'FIFO') {
          // Sort batches by earliest received/expiry
          relevantBatches.sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0));
          let remainingQty = branchQty;
          for (const b of relevantBatches) {
            const bQty = Number(b.qty !== undefined ? b.qty : (b.quantity || 0));
            const take = Math.min(bQty, remainingQty);
            totalValue += take * (b.receivedCost || standardCost);
            remainingQty -= take;
            if (remainingQty <= 0) break;
          }
          if (remainingQty > 0) {
            totalValue += remainingQty * standardCost;
          }
          calculatedUnitCost = branchQty > 0 ? Math.round((totalValue / branchQty) * 100) / 100 : standardCost;
        } else {
          // Weighted Average
          const batchValueSum = relevantBatches.reduce((acc, b) => {
            const bQty = Number(b.qty !== undefined ? b.qty : (b.quantity || 0));
            return acc + (bQty * (b.receivedCost || standardCost));
          }, 0);
          const batchQtySum = relevantBatches.reduce((acc, b) => acc + Number(b.qty !== undefined ? b.qty : (b.quantity || 0)), 0);
          calculatedUnitCost = batchQtySum > 0 ? Math.round((batchValueSum / batchQtySum) * 100) / 100 : standardCost;
          totalValue = branchQty * calculatedUnitCost;
        }
      } else {
        totalValue = branchQty * standardCost;
      }

      return {
        id: ing.id || ing._id,
        sku: ing.sku,
        name: ing.name,
        category: ing.category,
        baseUnit: ing.baseUnit,
        quantity: branchQty,
        unitCost: calculatedUnitCost,
        totalValue: Math.round(totalValue * 100) / 100,
        valuationMethod: method
      };
    });

    const totalPortfolioValue = reportRows.reduce((acc, r) => acc + r.totalValue, 0);

    return {
      method,
      branchId,
      branchName: branchId === 'all' ? 'All Enterprise Branches' : (branchList.find(b => b.id === branchId || b._id === branchId || b.code === branchId)?.name || branchId),
      generatedAt: new Date().toISOString(),
      items: reportRows,
      totalPortfolioValue: Math.round(totalPortfolioValue)
    };
  },

  // Export to CSV string
  generateCSV(headers, rows) {
    const csvHeader = headers.map(h => `"${h.label}"`).join(',');
    const csvBody = rows.map(row => {
      return headers.map(h => {
        const val = row[h.key] !== undefined ? row[h.key] : '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    }).join('\n');

    return `${csvHeader}\n${csvBody}`;
  },

  downloadCSV(filename, csvContent) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // ==========================================
  // REMOTE BACKEND / ATLAS SYNCHRONIZATION
  // ==========================================
  async fetchDashboardKPIsRemote(branchId = 'all') {
    try {
      const res = await apiClient(`/api/inventory/analytics/kpis?branch=${branchId}`);
      if (res && res.success && res.data) {
        const d = res.data;
        return {
          totalStockValue: Number(d.totalStockValue || 0),
          totalItemsTracked: Number(d.totalItemsTracked || 0),
          outOfStockCount: Number(d.outOfStockAlerts || 0),
          criticalLowCount: Number(d.criticalLowAlerts || 0),
          lowStockCount: Number(d.lowStockAlerts || 0),
          totalAlerts: Number(d.outOfStockAlerts || 0) + Number(d.lowStockAlerts || 0),
          expiringBatchesCount: Number(d.expiringBatchesCount || 0),
          pendingApprovalPOs: Number(d.activePOs || 0),
          activeOrderedPOs: Number(d.activePOs || 0),
          inTransitTransfers: Number(d.inTransitTransfers || 0),
          totalWastageCost: Number(d.totalWastageCost || 0)
        };
      }
    } catch (err) {
      console.warn('[AnalyticsService] Remote KPIs failed, calculating from local store:', err.message);
    }
    return this.getDashboardKPIs(branchId);
  },

  async fetchValuationRemote(branchId = 'all', method = 'FIFO') {
    try {
      const res = await apiClient(`/api/inventory/analytics/valuation?branch=${branchId}&method=${method}`);
      if (res && res.success && res.data) {
        const d = res.data;
        const normalizedItems = (d.items || []).map(row => {
          const qty = Number(row.quantity || 0);
          const uCost = Number(row.unitCost || 0);
          const totVal = Number(row.totalValue ?? row.valuation ?? (qty * uCost));
          return {
            id: String(row.id || row._id || `val_${Math.random()}`),
            sku: row.sku || 'SKU-UNKNOWN',
            name: row.name || 'Unnamed Ingredient',
            category: row.category || 'General',
            baseUnit: row.baseUnit || row.unit || 'kg',
            quantity: qty,
            unitCost: uCost,
            totalValue: Math.round(totVal * 100) / 100,
            valuationMethod: row.valuationMethod || method
          };
        });

        const totalVal = Number(d.totalPortfolioValue ?? normalizedItems.reduce((acc, r) => acc + r.totalValue, 0));

        return {
          method: d.method || method,
          branchId: d.branchId || d.branch || branchId,
          branchName: d.branchName || (branchId === 'all' ? 'All Enterprise Branches' : branchId),
          generatedAt: d.generatedAt || new Date().toISOString(),
          totalPortfolioValue: Math.round(totalVal * 100) / 100,
          items: normalizedItems
        };
      }
    } catch (err) {
      console.warn('[AnalyticsService] Remote valuation failed, calculating from local store:', err.message);
    }
    return this.getInventoryValuation(branchId, method);
  }
};
