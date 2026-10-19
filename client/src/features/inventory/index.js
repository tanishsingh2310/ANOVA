/**
 * ANOVA Inventory & Supply Chain Module (Member 2)
 * Public API & Module Descriptor for shared integration
 */

export { default as InventoryModule } from './InventoryModule';
export { default as InventoryNav } from './components/InventoryNav';
export { default as InventoryDashboard } from './pages/InventoryDashboard';
export { default as IngredientsPage } from './pages/IngredientsPage';
export { default as SuppliersPage } from './pages/SuppliersPage';
export { default as PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
export { default as TransfersPage } from './pages/TransfersPage';
export { default as WastagePage } from './pages/WastagePage';
export { default as ReportsPage } from './pages/ReportsPage';

export { InventoryService } from './services/inventoryService';
export { SupplierService } from './services/supplierService';
export { PurchaseOrderService } from './services/purchaseOrderService';
export { MovementService } from './services/movementService';
export { AnalyticsService } from './services/analyticsService';
export { UnitConversion } from './services/unitConversion';

/**
 * Navigation specification for integration into Member 1's Centralized Sidebar
 */
export const inventoryNavigation = {
  id: 'inventory-supply-chain',
  title: 'Inventory & Supply Chain',
  roleRequired: ['owner', 'admin', 'inventory_manager', 'branch_manager'],
  items: [
    { id: 'inv-dashboard', label: 'Inventory Overview', path: '/inventory/dashboard' },
    { id: 'inv-ingredients', label: 'Ingredients & Stock', path: '/inventory/ingredients' },
    { id: 'inv-suppliers', label: 'Supplier Directory', path: '/inventory/suppliers' },
    { id: 'inv-orders', label: 'Purchase Orders & GRN', path: '/inventory/orders' },
    { id: 'inv-transfers', label: 'Branch Transfers', path: '/inventory/transfers' },
    { id: 'inv-wastage', label: 'Wastage & Spoilage', path: '/inventory/wastage' },
    { id: 'inv-reports', label: 'Valuation & Reports', path: '/inventory/reports' }
  ]
};
