/**
 * ANOVA Inventory & Supply Chain Module
 * Public API & Module Descriptor for shared integration
 */

export { default as InventoryModule } from './InventoryModule';
export { default as InventoryNav } from './components/InventoryNav';
export { default as StockBadge } from './components/StockBadge';

export { default as IngredientsPage } from './ingredients/IngredientsPage';
export { default as BatchTrackerModal } from './ingredients/BatchTrackerModal';
export { default as StockAdjustmentModal } from './ingredients/StockAdjustmentModal';
export { default as SuppliersPage } from './suppliers/SuppliersPage';
export { default as PurchaseOrdersPage } from './orders/PurchaseOrdersPage';
export { default as TransfersPage } from './transfers/TransfersPage';
export { default as WastagePage } from './wastage/WastagePage';
export { default as ReportsPage } from './reports/ReportsPage';

// Domain Services
export { InventoryService } from './services/inventoryService';
export { SupplierService } from './services/supplierService';
export { PurchaseOrderService } from './services/purchaseOrderService';
export { MovementService } from './services/movementService';
export { AnalyticsService } from './services/analyticsService';
export { UnitConversion } from './services/unitConversion';

/**
 * Navigation specification for integration into Centralized Sidebar
 */
export const inventoryNavigation = {
  id: 'inventory-supply-chain',
  title: 'Inventory & Supply Chain',
  roleRequired: ['owner', 'admin', 'inventory_manager', 'branch_manager'],
  items: [
    { id: 'inv-ingredients', label: 'Ingredients & Stock', path: '/inventory/ingredients' },
    { id: 'inv-suppliers', label: 'Supplier Directory', path: '/inventory/suppliers' },
    { id: 'inv-orders', label: 'Purchase Orders & GRN', path: '/inventory/orders' },
    { id: 'inv-transfers', label: 'Branch Transfers', path: '/inventory/transfers' },
    { id: 'inv-wastage', label: 'Wastage & Spoilage', path: '/inventory/wastage' },
    { id: 'inv-reports', label: 'Valuation & Reports', path: '/inventory/reports' }
  ]
};
