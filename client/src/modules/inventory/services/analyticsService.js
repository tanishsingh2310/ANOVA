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

export const AnalyticsService = {
  getDashboardKPIs(branchId = 'all') {
    const ingredients = InventoryService.getIngredients();
    const purchaseOrders = PurchaseOrderService.getPurchaseOrders({ branchId });
    const transfers = MovementService.getTransfers({ branchId });
    const wastage = MovementService.getWastage({ branchId });
    const expiringBatches = InventoryService.getExpiringBatches(7, branchId);

    // Stock calculations
    let totalStockValue = 0;
    let criticalLowCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalItemsTracked = ingredients.length;

    ingredients.forEach(ing => {
      const status = InventoryService.calculateStockStatus(ing, branchId);
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
    const totalWastageCost = wastage.reduce((sum, w) => sum + (Number(w.totalCost) || 0), 0);

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
  getInventoryValuation(branchId = 'all', method = 'FIFO') {
    const ingredients = InventoryService.getIngredients();
    const branches = InventoryService.getBranches();

    const reportRows = ingredients.map(ing => {
      const branchQty = branchId === 'all'
        ? Object.values(ing.stockByBranch || {}).reduce((s, v) => s + (Number(v) || 0), 0)
        : Number(ing.stockByBranch?.[branchId] || 0);

      const standardCost = Number(ing.unitCost || 0);
      let calculatedUnitCost = standardCost;
      let totalValue = 0;

      const relevantBatches = (ing.batches || []).filter(b =>
        (branchId === 'all' || b.branchId === branchId) && b.qty > 0
      );

      if (relevantBatches.length > 0) {
        if (method === 'FIFO') {
          // Sort batches by earliest received/expiry
          relevantBatches.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
          let remainingQty = branchQty;
          for (const b of relevantBatches) {
            const take = Math.min(b.qty, remainingQty);
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
          const batchValueSum = relevantBatches.reduce((acc, b) => acc + (b.qty * (b.receivedCost || standardCost)), 0);
          const batchQtySum = relevantBatches.reduce((acc, b) => acc + b.qty, 0);
          calculatedUnitCost = batchQtySum > 0 ? Math.round((batchValueSum / batchQtySum) * 100) / 100 : standardCost;
          totalValue = branchQty * calculatedUnitCost;
        }
      } else {
        totalValue = branchQty * standardCost;
      }

      return {
        id: ing.id,
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
      branchName: branchId === 'all' ? 'All Enterprise Branches' : (branches.find(b => b.id === branchId)?.name || branchId),
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
  }
};
