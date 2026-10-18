// ============================================================
// ANOVA INVENTORY & SUPPLY CHAIN — VERIFICATION TEST SUITE
// Automated verification using Node.js test runner (node:test)
// Tests all business rules, data integrity constraints,
// procurement lifecycle, branch isolation, and costing methods.
// ============================================================

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// In-Memory Storage Polyfill for headless testing
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) || null,
  setItem: (key, val) => store.set(key, String(val)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear()
};

// Import Services
import { InventoryService } from '../client/src/modules/inventory/services/inventoryService.js';
import { SupplierService } from '../client/src/modules/inventory/services/supplierService.js';
import { PurchaseOrderService } from '../client/src/modules/inventory/services/purchaseOrderService.js';
import { MovementService } from '../client/src/modules/inventory/services/movementService.js';
import { AnalyticsService } from '../client/src/modules/inventory/services/analyticsService.js';

describe('ANOVA Inventory & Supply Chain Suite', () => {

  beforeEach(() => {
    store.clear();
  });

  // ==========================================================
  // SUBSECTION 3A: INGREDIENTS & BRANCH INVENTORY
  // ==========================================================
  describe('3A: Ingredients & Branch Inventory', () => {
    test('3A.1 - Should register, retrieve, and delete an ingredient with canonical units', () => {
      const newIng = InventoryService.saveIngredient({
        name: 'Fresh Truffle Butter',
        sku: 'ING-DAI-099',
        category: 'Dairy & Cheese',
        baseUnit: 'kg',
        unitCost: 1200,
        minThreshold: 5,
        maxThreshold: 20,
        reorderLevel: 8
      });

      assert.ok(newIng.id, 'Ingredient ID should be generated');
      assert.equal(newIng.sku, 'ING-DAI-099');
      assert.equal(newIng.baseUnit, 'kg');

      const retrieved = InventoryService.getIngredientById(newIng.id);
      assert.equal(retrieved.name, 'Fresh Truffle Butter');

      // Delete
      InventoryService.deleteIngredient(newIng.id);
      const afterDelete = InventoryService.getIngredientById(newIng.id);
      assert.equal(afterDelete, null, 'Deleted ingredient should not exist');
    });

    test('3A.2 - Should enforce branch isolation for stock quantities', () => {
      const ing = InventoryService.getIngredientById('ing_01'); // Organic Hass Avocados
      assert.ok(ing, 'Seed avocado exists');

      // Verify each branch has isolated distinct stock counts
      const downtownStock = ing.stockByBranch.b_downtown;
      const uptownStock = ing.stockByBranch.b_uptown;
      const westsideStock = ing.stockByBranch.b_westside;

      assert.equal(typeof downtownStock, 'number');
      assert.equal(typeof uptownStock, 'number');
      assert.notEqual(downtownStock, uptownStock, 'Branch stock balances must be isolated');

      // Check enterprise total
      const statusEnterprise = InventoryService.calculateStockStatus(ing, 'all');
      const expectedTotal = downtownStock + uptownStock + westsideStock + ing.stockByBranch.b_waterfront;
      assert.equal(statusEnterprise.qty, expectedTotal, 'Enterprise view must sum all branches');
    });

    test('3A.3 - Should adjust physical count and log a mandatory audit record with delta', () => {
      const ing = InventoryService.getIngredientById('ing_01');
      const initialStock = ing.stockByBranch.b_downtown;

      const newPhysicalCount = initialStock + 5; // Surplus of 5 kg discovered during audit
      const { item, movement } = InventoryService.adjustStock({
        ingredientId: 'ing_01',
        branchId: 'b_downtown',
        newQty: newPhysicalCount,
        reason: 'PHYSICAL_COUNT_VARIANCE',
        notes: 'Monthly physical stock audit discrepancy',
        user: 'Arjun Verma (Director)'
      });

      assert.equal(item.stockByBranch.b_downtown, newPhysicalCount, 'Branch balance updated to counted value');
      assert.equal(movement.type, 'STOCK_ADJUSTMENT');
      assert.equal(movement.deltaQty, +5, 'Delta variance must reflect positive surplus');
      assert.equal(movement.resultingBalance, newPhysicalCount);
      assert.equal(movement.performedBy, 'Arjun Verma (Director)');

      // Verify movement persists in history
      const history = InventoryService.getMovements({ branchId: 'b_downtown', ingredientId: 'ing_01' });
      assert.ok(history.length > 0, 'Movement must be recorded in audit history');
    });

    test('3A.4 - Should accurately detect batches expiring within threshold', () => {
      // Seed avocado bat_01_3 in Uptown expires in 3 days (2026-10-18)
      const expiring = InventoryService.getExpiringBatches(7, 'all');
      assert.ok(expiring.length > 0, 'Should detect expiring batches within 7 days');

      const burrataBatch = expiring.find(b => b.ingredientId === 'ing_02');
      assert.ok(burrataBatch, 'Burrata batch expiring within 2 days must be flagged');
      assert.ok(burrataBatch.diffDays <= 7, 'Diff days must be within threshold');
    });
  });

  // ==========================================================
  // SUBSECTION 3B: SUPPLIER MANAGEMENT
  // ==========================================================
  describe('3B: Supplier Management', () => {
    test('3B.1 - Should onboard new vendor with lead times, payment terms, and ratings', () => {
      const newSup = SupplierService.saveSupplier({
        name: 'Nilgiri Artisanal Tea & Herbals',
        code: 'NATH',
        category: 'Beverages & Syrups',
        contactPerson: 'Devika Menon',
        email: 'orders@nilgiritea.com',
        phone: '+91 94430 11223',
        city: 'Ooty',
        leadTimeDays: 3,
        paymentTerms: 'Net 30',
        taxId: '33AABCN1234P1Z2'
      });

      assert.ok(newSup.id);
      assert.equal(newSup.status, 'ACTIVE');
      assert.equal(newSup.leadTimeDays, 3);
      assert.equal(newSup.rating, 4.5);

      const retrieved = SupplierService.getSupplierById(newSup.id);
      assert.equal(retrieved.name, 'Nilgiri Artisanal Tea & Herbals');
    });

    test('3B.2 - Should toggle supplier status without deleting historical records', () => {
      const sup = SupplierService.getSupplierById('sup_01');
      assert.equal(sup.status, 'ACTIVE');

      SupplierService.toggleStatus('sup_01');
      const toggled = SupplierService.getSupplierById('sup_01');
      assert.equal(toggled.status, 'INACTIVE', 'Supplier status changed to INACTIVE');

      // Ingredients still linked to supplier
      const supplied = SupplierService.getSuppliedIngredients('sup_01');
      assert.ok(supplied.length > 0, 'Historical catalog linkages must be preserved upon deactivation');

      // Reactivate
      SupplierService.toggleStatus('sup_01');
      assert.equal(SupplierService.getSupplierById('sup_01').status, 'ACTIVE');
    });
  });

  // ==========================================================
  // SUBSECTION 3C: PURCHASE ORDERS & GOODS RECEIVING
  // ==========================================================
  describe('3C: Purchase Orders & Goods Receiving Lifecycle', () => {
    test('3C.1 - PO creation and approval MUST NOT increase available stock', () => {
      const ing = InventoryService.getIngredientById('ing_01');
      const initialStock = Number(ing.stockByBranch.b_downtown);

      // Create PO
      const po = PurchaseOrderService.createPO({
        supplierId: 'sup_01',
        branchId: 'b_downtown',
        expectedDate: '2026-10-25',
        items: [
          { ingredientId: 'ing_01', orderedQty: 50, unit: 'kg', unitPrice: 320 }
        ]
      });

      assert.equal(po.status, 'DRAFT');

      // Verify stock did NOT change
      let currentIng = InventoryService.getIngredientById('ing_01');
      assert.equal(Number(currentIng.stockByBranch.b_downtown), initialStock, 'Stock MUST NOT increase on PO draft');

      // Submit and Approve PO
      PurchaseOrderService.updateStatus(po.id, 'SUBMITTED');
      PurchaseOrderService.updateStatus(po.id, 'APPROVED', 'Arjun Verma (Director)');
      PurchaseOrderService.updateStatus(po.id, 'ORDERED');

      // Verify stock STILL did not change
      currentIng = InventoryService.getIngredientById('ing_01');
      assert.equal(Number(currentIng.stockByBranch.b_downtown), initialStock, 'Stock MUST NOT increase upon PO approval or ordering');
    });

    test('3C.2 - Goods Receiving Note (GRN): ONLY accepted goods increase stock, rejects/damages tracked', () => {
      const ing = InventoryService.getIngredientById('ing_01');
      const initialStock = Number(ing.stockByBranch.b_downtown);

      // Order po_1001 is in ORDERED status with 25 kg avocados ordered
      const { po, grnNumber } = PurchaseOrderService.receiveGoods({
        poId: 'po_1001',
        grnNumber: 'GRN-TEST-100',
        receiverName: 'Receiving Officer Rohan',
        receiptItems: [
          {
            ingredientId: 'ing_01',
            acceptedQty: 20, // 20 kg accepted
            rejectedQty: 3,  // 3 kg rejected (bruised)
            damagedQty: 2,   // 2 kg damaged (crushed crate)
            batchNumber: 'AVO-TEST-BATCH',
            expiryDate: '2026-11-05',
            unitCost: 320
          }
        ],
        notes: '3kg rejected due to mold, 2kg crate crushed'
      });

      assert.ok(grnNumber);

      // Verify stock increased ONLY by acceptedQty (+20), NOT ordered (25) or rejected (3) or damaged (2)
      const updatedIng = InventoryService.getIngredientById('ing_01');
      const expectedStock = initialStock + 20;
      assert.equal(Number(updatedIng.stockByBranch.b_downtown), expectedStock, 'Stock must increment ONLY by acceptedQty');

      // Verify new batch created
      const batch = updatedIng.batches.find(b => b.batchNumber === 'AVO-TEST-BATCH');
      assert.ok(batch, 'New batch must be created in ledger');
      assert.equal(batch.qty, 20);

      // Verify audit movement created
      const movements = InventoryService.getMovements({ branchId: 'b_downtown', ingredientId: 'ing_01' });
      const receiptMovement = movements.find(m => m.reference.includes('GRN-TEST-100'));
      assert.ok(receiptMovement, 'Audit movement must be generated for receipt');
      assert.equal(receiptMovement.deltaQty, +20);
    });

    test('3C.3 - Should reject duplicate GRN receipt submissions', () => {
      // Re-submitting the exact same GRN reference must throw an error
      assert.throws(() => {
        PurchaseOrderService.receiveGoods({
          poId: 'po_1001',
          grnNumber: 'GRN-TEST-100', // Duplicate
          receiptItems: [{ ingredientId: 'ing_01', acceptedQty: 5 }]
        });
      }, /Duplicate receipt detected/);
    });
  });

  // ==========================================================
  // SUBSECTION 3D: STOCK MOVEMENTS, TRANSFERS & WASTAGE
  // ==========================================================
  describe('3D: Stock Movements, Transfers & Wastage', () => {
    test('3D.1 - Should prevent transfer dispatch when source branch has insufficient stock', () => {
      const ing = InventoryService.getIngredientById('ing_01');
      const availableDowntown = Number(ing.stockByBranch.b_downtown);

      assert.throws(() => {
        MovementService.dispatchTransfer({
          fromBranchId: 'b_downtown',
          toBranchId: 'b_uptown',
          items: [{ ingredientId: 'ing_01', qty: availableDowntown + 9999 }] // Excessive quantity
        });
      }, /Insufficient stock/);
    });

    test('3D.2 - Transfer dispatch isolates stock In-Transit and prevents double counting', () => {
      const ing = InventoryService.getIngredientById('ing_05'); // Carnaroli Rice
      const sourceBefore = Number(ing.stockByBranch.b_downtown);
      const destBefore = Number(ing.stockByBranch.b_uptown);

      // Dispatch 15 kg from Downtown to Uptown
      const transfer = MovementService.dispatchTransfer({
        fromBranchId: 'b_downtown',
        toBranchId: 'b_uptown',
        items: [{ ingredientId: 'ing_05', qty: 15, unit: 'kg', unitCost: 280 }],
        dispatchedBy: 'Sanjay Rawat'
      });

      assert.equal(transfer.status, 'IN_TRANSIT');

      // Verify source stock is deducted immediately
      const ingAfterDispatch = InventoryService.getIngredientById('ing_05');
      assert.equal(Number(ingAfterDispatch.stockByBranch.b_downtown), sourceBefore - 15, 'Source branch stock deducted on dispatch');

      // Verify destination stock has NOT increased yet (Double-count protection)
      assert.equal(Number(ingAfterDispatch.stockByBranch.b_uptown), destBefore, 'Destination branch stock must not increase during transit');

      // Receive transfer at destination
      MovementService.receiveTransfer({
        transferId: transfer.id,
        receivedBy: 'Chef Anita (Uptown)'
      });

      const ingAfterReceive = InventoryService.getIngredientById('ing_05');
      assert.equal(Number(ingAfterReceive.stockByBranch.b_uptown), destBefore + 15, 'Destination branch stock increases ONLY upon receipt');
    });

    test('3D.3 - Wastage logging accurately deducts stock and records financial loss', () => {
      const ing = InventoryService.getIngredientById('ing_03'); // Salmon
      const stockBefore = Number(ing.stockByBranch.b_downtown);
      const unitCost = Number(ing.unitCost);

      const wasteLog = MovementService.logWastage({
        branchId: 'b_downtown',
        ingredientId: 'ing_03',
        qty: 2.0,
        reason: 'SPOILED',
        notes: 'Chiller door gasket failure',
        loggedBy: 'Chef Anita'
      });

      assert.equal(wasteLog.totalCost, unitCost * 2.0, 'Financial loss must match unitCost * quantity');

      const ingAfter = InventoryService.getIngredientById('ing_03');
      assert.equal(Number(ingAfter.stockByBranch.b_downtown), stockBefore - 2.0, 'Stock deducted from branch');

      // Check movements
      const movements = InventoryService.getMovements({ branchId: 'b_downtown', ingredientId: 'ing_03' });
      const wasteMov = movements.find(m => m.reference === wasteLog.wasteNumber);
      assert.ok(wasteMov);
      assert.equal(wasteMov.deltaQty, -2.0);
    });
  });

  // ==========================================================
  // SUBSECTION 3E: ALERTS, REPORTING & VALUATION
  // ==========================================================
  describe('3E: Alerts, Valuation & Reporting', () => {
    test('3E.1 - Should calculate stock valuation using FIFO and Weighted Average costing', () => {
      const fifoValuation = AnalyticsService.getInventoryValuation('all', 'FIFO');
      const weightedValuation = AnalyticsService.getInventoryValuation('all', 'WEIGHTED_AVG');

      assert.ok(fifoValuation.totalPortfolioValue > 0, 'FIFO total value must be positive');
      assert.ok(weightedValuation.totalPortfolioValue > 0, 'Weighted total value must be positive');
      assert.equal(fifoValuation.items.length, weightedValuation.items.length);
    });

    test('3E.2 - Should generate valid RFC-compliant CSV formatted exports', () => {
      const headers = [
        { label: 'SKU', key: 'sku' },
        { label: 'Name', key: 'name' },
        { label: 'Cost', key: 'cost' }
      ];
      const rows = [
        { sku: 'ING-01', name: 'Organic Hass Avocados', cost: 320 },
        { sku: 'ING-02', name: 'Burrata "Special", Italy', cost: 650 }
      ];

      const csv = AnalyticsService.generateCSV(headers, rows);
      assert.ok(csv.includes('"SKU","Name","Cost"'));
      assert.ok(csv.includes('"Organic Hass Avocados"'));
      assert.ok(csv.includes('""Special""'), 'Special quotes must be escaped per RFC 4180');
    });

    test('3E.3 - Dashboard KPIs aggregate real live inventory data', () => {
      const kpis = AnalyticsService.getDashboardKPIs('all');
      assert.ok(kpis.totalStockValue > 0);
      assert.ok(kpis.totalItemsTracked >= 8);
      assert.ok(typeof kpis.totalAlerts === 'number');
      assert.ok(typeof kpis.inTransitTransfers === 'number');
      assert.ok(typeof kpis.totalWastageCost === 'number');
    });
  });

  // ==========================================================
  // PHASE 4: DATA INTEGRITY, CONVERSION & SECURITY RULES
  // ==========================================================
  describe('Phase 4: Critical Data Integrity & Authorization Constraints', () => {
    test('4.1 - Canonical Unit Conversions validate dimensions accurately', async () => {
      const { UnitConversion } = await import('../client/src/modules/inventory/services/unitConversion.js');

      // Valid weight conversion: 2.75 kg -> 2750 g
      const grams = UnitConversion.convert(2.75, 'kg', 'g');
      assert.equal(grams, 2750, '2.75 kg must equal 2750 g');

      // Valid volume conversion: 1250 ml -> 1.25 L
      const liters = UnitConversion.convert(1250, 'ml', 'L');
      assert.equal(liters, 1.25, '1250 ml must equal 1.25 L');

      // Incompatible conversion: kg to L must be rejected
      assert.throws(() => {
        UnitConversion.convert(5, 'kg', 'L');
      }, /Incompatible unit conversion/);

      // Incompatible conversion: pcs to kg must be rejected
      assert.throws(() => {
        UnitConversion.convert(10, 'pcs', 'kg');
      }, /Incompatible unit conversion/);
    });

    test('4.2 - Numeric Precision enforces 3 decimals for quantities and 2 for currency', async () => {
      const { UnitConversion } = await import('../client/src/modules/inventory/services/unitConversion.js');

      // Quantities: 3 decimal places
      const roundedQty = UnitConversion.roundQuantity(3.14159);
      assert.equal(roundedQty, 3.142);

      // Currency: 2 decimal places (paise)
      const roundedMoney = UnitConversion.roundCurrency(149.999);
      assert.equal(roundedMoney, 150.00);

      // Currency formatting
      const formatted = UnitConversion.formatCurrency(48650.5);
      assert.ok(formatted.includes('48,650.50'));
    });

    test('4.3 - BranchGuard authorization isolates branch managers and allows admin bypass', async () => {
      const branchGuard = (await import('../server/src/middleware/branchGuard.js')).default || (await import('../server/src/middleware/branchGuard.js'));

      // Case 1: Branch Manager assigned to Downtown trying to access Uptown
      let forbiddenCalled = false;
      let statusCode = 200;
      const reqManagerDowntown = {
        user: { id: 'm1', role: 'manager', branchId: 'b_downtown' },
        body: { branch: 'b_uptown' }
      };
      const resForbidden = {
        status: (code) => {
          statusCode = code;
          return {
            json: () => { forbiddenCalled = true; }
          };
        }
      };

      branchGuard(reqManagerDowntown, resForbidden, () => {});
      assert.equal(statusCode, 403, 'Manager accessing different branch must receive 403 Forbidden');
      assert.equal(forbiddenCalled, true);

      // Case 2: Branch Manager accessing their own branch -> Allowed
      let nextCalled = false;
      const reqManagerSelf = {
        user: { id: 'm1', role: 'manager', branchId: 'b_downtown' },
        body: { branch: 'b_downtown' }
      };
      branchGuard(reqManagerSelf, {}, () => { nextCalled = true; });
      assert.equal(nextCalled, true, 'Manager accessing own branch must proceed');

      // Case 3: Enterprise Admin accessing any branch -> Allowed
      let adminAllowed = false;
      const reqAdmin = {
        user: { id: 'a1', role: 'admin', branchId: 'all' },
        body: { branch: 'b_waterfront' }
      };
      branchGuard(reqAdmin, {}, () => { adminAllowed = true; });
      assert.equal(adminAllowed, true, 'Admin has multi-branch clearance across all locations');
    });

    test('4.4 - Concurrency updates and compensating transaction rollback safety', async () => {
      const ing = InventoryService.getIngredientById('ing_01');
      const startStock = Number(ing.stockByBranch.b_downtown);

      // Perform transaction 1: Stock adjustment
      const { movement } = InventoryService.adjustStock({
        ingredientId: 'ing_01',
        branchId: 'b_downtown',
        newQty: startStock + 10,
        reason: 'RECEIVING_CORRECTION',
        notes: 'Adjustment step 1',
        user: 'Audit Lead'
      });

      assert.equal(movement.resultingBalance, startStock + 10);

      // Attempt invalid second transaction that triggers rollback
      assert.throws(() => {
        MovementService.dispatchTransfer({
          fromBranchId: 'b_downtown',
          toBranchId: 'b_uptown',
          items: [{ ingredientId: 'ing_01', qty: startStock + 9999 }] // Exceeds balance
        });
      }, /Insufficient stock/);

      // Verify balance remains uncorrupted at startStock + 10
      const current = InventoryService.getIngredientById('ing_01');
      assert.equal(Number(current.stockByBranch.b_downtown), startStock + 10, 'Failed transaction must not corrupt stock state');

      // Compensating transaction: reversing the correction cleanly
      const { movement: compMov } = InventoryService.adjustStock({
        ingredientId: 'ing_01',
        branchId: 'b_downtown',
        newQty: startStock,
        reason: 'COMPENSATING_REVERSAL',
        notes: 'Reversing adjustment step 1',
        user: 'Audit Lead'
      });

      assert.equal(compMov.resultingBalance, startStock);
      assert.equal(compMov.deltaQty, -10, 'Compensating transaction restores exact balance with audit record');
    });
  });

  // ==========================================================
  // PHASE 2: AUTHENTICATION, AUTHORIZATION & RBAC VERIFICATION
  // ==========================================================
  describe('Phase 2: Authentication, Authorization & RBAC Verification', () => {
    test('2.1 - Protect middleware rejects missing or invalid JWT tokens with 401', async () => {
      const { protect } = await import('../server/src/middleware/auth.js');

      // Case A: Missing authorization header
      let statusA = 0;
      let jsonA = null;
      protect({ headers: {} }, {
        status: (code) => { statusA = code; return { json: (d) => { jsonA = d; } }; }
      }, () => {});
      assert.equal(statusA, 401);
      assert.equal(jsonA.success, false);

      // Case B: Invalid / malformed token
      let statusB = 0;
      protect({ headers: { authorization: 'Bearer invalid.token.signature' } }, {
        status: (code) => { statusB = code; return { json: () => {} }; }
      }, () => {});
      assert.equal(statusB, 401);
    });

    test('2.2 - Protect middleware verifies valid cryptographic JWT and builds req.user context', async () => {
      const { protect } = await import('../server/src/middleware/auth.js');
      const { createDevToken } = await import('../server/src/utils/tokenUtil.js');

      const token = createDevToken('inventory_manager', 'b_downtown', { id: 'usr_test_im_01' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      let nextCalled = false;

      protect(req, {}, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
      assert.equal(req.user.id, 'usr_test_im_01');
      assert.equal(req.user.role, 'inventory_manager');
      assert.equal(req.user.branchId, 'b_downtown');
    });

    test('2.3 - Authorize middleware restricts access based on canonical ANOVA roles', async () => {
      const { authorize } = await import('../server/src/middleware/auth.js');
      const { ROLES, SENSITIVE_ADMIN_ROLES, INVENTORY_WRITE_ROLES } = await import('../server/src/config/roles.js');

      const guardAdminOnly = authorize(SENSITIVE_ADMIN_ROLES);
      const guardWrite = authorize(INVENTORY_WRITE_ROLES);

      // Cashier attempting sensitive admin deletion -> 403 Forbidden
      let statusCashier = 0;
      guardAdminOnly({ user: { role: ROLES.CASHIER } }, {
        status: (code) => { statusCashier = code; return { json: () => {} }; }
      }, () => {});
      assert.equal(statusCashier, 403);

      // Inventory Manager attempting sensitive admin deletion -> 403 Forbidden
      let statusIM = 0;
      guardAdminOnly({ user: { role: ROLES.INVENTORY_MANAGER } }, {
        status: (code) => { statusIM = code; return { json: () => {} }; }
      }, () => {});
      assert.equal(statusIM, 403);

      // Admin attempting sensitive admin action -> Allowed
      let adminAllowed = false;
      guardAdminOnly({ user: { role: ROLES.ADMIN } }, {}, () => { adminAllowed = true; });
      assert.equal(adminAllowed, true);

      // Inventory Manager attempting normal stock write -> Allowed
      let writeAllowed = false;
      guardWrite({ user: { role: ROLES.INVENTORY_MANAGER } }, {}, () => { writeAllowed = true; });
      assert.equal(writeAllowed, true);
    });

    test('2.4 - BranchGuard enforces branch isolation and grants enterprise bypass to Owner/Admin', async () => {
      const branchGuard = (await import('../server/src/middleware/branchGuard.js')).default || (await import('../server/src/middleware/branchGuard.js'));
      const { ROLES } = await import('../server/src/config/roles.js');

      // Downtown Branch Manager attempting to mutate Uptown inventory -> 403
      let statusCode = 0;
      branchGuard(
        { user: { role: ROLES.BRANCH_MANAGER, branchId: 'b_downtown' }, body: { branch: 'b_uptown' } },
        { status: (code) => { statusCode = code; return { json: () => {} }; } },
        () => {}
      );
      assert.equal(statusCode, 403);

      // Owner accessing any branch -> Allowed
      let ownerAllowed = false;
      branchGuard(
        { user: { role: ROLES.OWNER, branchId: 'all' }, body: { branch: 'b_uptown' } },
        {},
        () => { ownerAllowed = true; }
      );
      assert.equal(ownerAllowed, true);
    });
  });

  // ==========================================================
  // PHASE 3: DATA MODELS, SCHEMAS & CROSS-MODULE ENTITY REFERENCES
  // ==========================================================
  describe('Phase 3: Data Models, Schemas & Cross-Module References', () => {
    test('3.1 - Supplier model schema includes User account linkage and supplied catalog', async () => {
      const Supplier = (await import('../server/src/models/Supplier.js')).default || (await import('../server/src/models/Supplier.js'));
      const paths = Supplier.schema.paths;

      assert.ok(paths.user, 'Supplier schema must have user field');
      assert.equal(paths.user.instance, 'ObjectId');
      assert.ok(paths.suppliedIngredients, 'Supplier schema must have suppliedIngredients field');
    });

    test('3.2 - PurchaseOrder schema supports branchRef and User audit references', async () => {
      const PurchaseOrder = (await import('../server/src/models/PurchaseOrder.js')).default || (await import('../server/src/models/PurchaseOrder.js'));
      const paths = PurchaseOrder.schema.paths;

      assert.ok(paths.branch, 'PurchaseOrder must have branch string/code');
      assert.ok(paths.branchRef, 'PurchaseOrder must have branchRef ObjectId');
      assert.ok(paths.createdByUser, 'PurchaseOrder must have createdByUser ObjectId');
      assert.ok(paths.approvedByUser, 'PurchaseOrder must have approvedByUser ObjectId');
    });

    test('3.3 - Ingredient model supports flexible branch stock accessors', async () => {
      const Ingredient = (await import('../server/src/models/Ingredient.js')).default || (await import('../server/src/models/Ingredient.js'));
      
      const ing = new Ingredient({
        sku: 'TEST-SKU-001',
        name: 'Test Ingredient',
        category: 'Produce & Greens',
        baseUnit: 'kg',
        unitCost: 100,
        minThreshold: 10,
        stockByBranch: new Map([
          ['b_downtown', 45],
          ['6ad0e90a53cc462cbaaec9fa', 80]
        ])
      });

      // Test string code lookup
      assert.equal(ing.getStock('b_downtown'), 45);

      // Test 24-character hexadecimal ObjectId lookup
      assert.equal(ing.getStock('6ad0e90a53cc462cbaaec9fa'), 80);

      // Test enterprise global total
      assert.equal(ing.getStock('all'), 125);

      // Test stock mutation
      ing.setStock('b_downtown', 50);
      assert.equal(ing.getStock('b_downtown'), 50);
    });
  });
});
