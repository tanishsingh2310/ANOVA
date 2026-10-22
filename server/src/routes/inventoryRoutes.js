const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const branchGuard = require('../middleware/branchGuard');
const {
  ENTERPRISE_ROLES,
  INVENTORY_READ_ROLES,
  INVENTORY_WRITE_ROLES,
  PROCUREMENT_WRITE_ROLES,
  SENSITIVE_ADMIN_ROLES,
  KITCHEN_CONSUME_ROLES
} = require('../config/roles');
const inventoryController = require('../controllers/inventoryController');

// Enforce authentication across all inventory routes
router.use(protect);

// ==========================================
// 1. INGREDIENTS & STOCK
// ==========================================
router.get('/ingredients', authorize(INVENTORY_READ_ROLES), inventoryController.getIngredients);
router.post('/ingredients', authorize(INVENTORY_WRITE_ROLES), inventoryController.createIngredient);
router.post('/ingredients/:id/adjust', authorize(INVENTORY_WRITE_ROLES), branchGuard, inventoryController.adjustStock);
router.get('/batches/expiring', authorize(INVENTORY_READ_ROLES), inventoryController.getExpiringBatches);
router.get('/ingredients/:id', authorize(INVENTORY_READ_ROLES), inventoryController.getIngredientById);
router.put('/ingredients/:id', authorize(INVENTORY_WRITE_ROLES), inventoryController.updateIngredient);
router.delete('/ingredients/:id', authorize(SENSITIVE_ADMIN_ROLES), inventoryController.deleteIngredient);

// ==========================================
// 2. SUPPLIERS
// ==========================================
router.get('/suppliers', inventoryController.getSuppliers);
router.post('/suppliers', authorize(PROCUREMENT_WRITE_ROLES), inventoryController.createSupplier);
router.patch('/suppliers/:id/status', authorize(SENSITIVE_ADMIN_ROLES), inventoryController.updateSupplierStatus);
router.get('/suppliers/:id', inventoryController.getSupplierById);
router.put('/suppliers/:id', authorize(PROCUREMENT_WRITE_ROLES), inventoryController.updateSupplier);

// ==========================================
// 3. PURCHASE ORDERS & GOODS RECEIVING
// ==========================================
router.get('/purchase-orders', inventoryController.getPurchaseOrders);
router.post('/purchase-orders', authorize(INVENTORY_WRITE_ROLES), branchGuard, inventoryController.createPurchaseOrder);
router.patch('/purchase-orders/:id/approve', authorize(ENTERPRISE_ROLES), inventoryController.approvePurchaseOrder);
router.patch('/purchase-orders/:id/status', authorize(ENTERPRISE_ROLES), inventoryController.updatePurchaseOrderStatus);
router.post('/purchase-orders/:id/receive', authorize(INVENTORY_WRITE_ROLES), inventoryController.receivePurchaseOrder);
router.get('/purchase-orders/:id', inventoryController.getPurchaseOrderById);
router.delete('/purchase-orders/:id', authorize(INVENTORY_WRITE_ROLES), inventoryController.deletePurchaseOrder);

// ==========================================
// 4. TRANSFERS & WASTAGE
// ==========================================
router.get('/transfers', authorize(INVENTORY_READ_ROLES), inventoryController.getTransfers);
router.post('/transfers/dispatch', authorize(INVENTORY_WRITE_ROLES), branchGuard, inventoryController.dispatchTransfer);
router.post('/transfers/:id/receive', authorize(INVENTORY_WRITE_ROLES), inventoryController.receiveTransfer);
router.get('/transfers/:id', authorize(INVENTORY_READ_ROLES), inventoryController.getTransferById);

router.get('/wastage', authorize(INVENTORY_READ_ROLES), inventoryController.getWastage);
router.post('/wastage', authorize(INVENTORY_WRITE_ROLES), branchGuard, inventoryController.recordWastage);

// ==========================================
// 5. AUDIT MOVEMENTS
// ==========================================
router.get('/movements', authorize(INVENTORY_READ_ROLES), inventoryController.getMovements);

// ==========================================
// 6. ANALYTICS & REPORTS
// ==========================================
router.get('/analytics/kpis', authorize(INVENTORY_READ_ROLES), inventoryController.getDashboardKPIs);
router.get('/analytics/valuation', authorize(INVENTORY_READ_ROLES), inventoryController.getValuation);

// ==========================================
// 7. KITCHEN CONSUMPTION & CROSS-MODULE INTEGRATION HANDSHAKES
// ==========================================
router.get('/stock-status', authorize(INVENTORY_READ_ROLES), inventoryController.getStockStatus);
router.post('/recipe/check-availability', authorize(KITCHEN_CONSUME_ROLES), branchGuard, inventoryController.checkRecipeAvailability);
router.post('/recipe/consume', authorize(KITCHEN_CONSUME_ROLES), branchGuard, inventoryController.consumeRecipe);

module.exports = router;
