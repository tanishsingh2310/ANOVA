const express = require('express');
const router = express.Router();
const Ingredient = require('../models/Ingredient');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const StockTransfer = require('../models/StockTransfer');
const Wastage = require('../models/Wastage');
const StockMovement = require('../models/StockMovement');

// Standard response helper
const sendResponse = (res, statusCode, success, data, message) => {
  return res.status(statusCode).json({ success, data, message });
};

// ==========================================
// 1. INGREDIENTS & STOCK
// ==========================================
router.get('/ingredients', async (req, res, next) => {
  try {
    const { branch, category, search } = req.query;
    let query = {};
    if (category && category !== 'ALL') query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    const ingredients = await Ingredient.find(query).populate('primarySupplier', 'name code').sort({ name: 1 });
    sendResponse(res, 200, true, ingredients, 'Ingredients retrieved successfully');
  } catch (err) {
    next(err);
  }
});

router.post('/ingredients', async (req, res, next) => {
  try {
    const ingredient = new Ingredient(req.body);
    await ingredient.save();
    sendResponse(res, 201, true, ingredient, 'Ingredient registered successfully');
  } catch (err) {
    next(err);
  }
});

router.post('/ingredients/:id/adjust', async (req, res, next) => {
  try {
    const { branch, newQuantity, reason, notes, user = 'Manager' } = req.body;
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) return sendResponse(res, 404, false, null, 'Ingredient not found');

    const previousQty = ingredient.stockByBranch.get(branch) || 0;
    const delta = Number(newQuantity) - previousQty;

    ingredient.stockByBranch.set(branch, Number(newQuantity));
    await ingredient.save();

    // Audit log
    const movement = new StockMovement({
      type: 'STOCK_ADJUSTMENT',
      reference: `ADJ-${reason}`,
      ingredient: ingredient._id,
      branch,
      deltaQty: delta,
      unit: ingredient.baseUnit,
      resultingBalance: Number(newQuantity),
      performedBy: user,
      notes: notes ? `${reason}: ${notes}` : reason
    });
    await movement.save();

    sendResponse(res, 200, true, { ingredient, movement }, 'Stock adjusted with audit trail');
  } catch (err) {
    next(err);
  }
});

// GET /batches/expiring - Expiring batches within threshold
router.get('/batches/expiring', async (req, res, next) => {
  try {
    const days = Number(req.query.days) || 7;
    const { branch } = req.query;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    const ingredients = await Ingredient.find({
      'batches.expiryDate': { $lte: targetDate }
    });

    const expiringBatches = [];
    for (const ing of ingredients) {
      for (const batch of ing.batches) {
        if (batch.quantity > 0 && batch.expiryDate <= targetDate) {
          if (!branch || branch === 'all' || batch.branch === branch) {
            const diffTime = new Date(batch.expiryDate).getTime() - Date.now();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            expiringBatches.push({
              ingredientId: ing._id,
              ingredientName: ing.name,
              sku: ing.sku,
              unit: ing.baseUnit,
              unitCost: ing.unitCost,
              batchNumber: batch.batchNumber,
              branch: batch.branch,
              quantity: batch.quantity,
              expiryDate: batch.expiryDate,
              diffDays,
              isExpired: diffDays < 0
            });
          }
        }
      }
    }

    expiringBatches.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    sendResponse(res, 200, true, expiringBatches, 'Expiring batches retrieved');
  } catch (err) {
    next(err);
  }
});

// GET /ingredients/:id - Single ingredient
router.get('/ingredients/:id', async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id).populate('primarySupplier', 'name code city');
    if (!ingredient) return sendResponse(res, 404, false, null, 'Ingredient not found');
    sendResponse(res, 200, true, ingredient, 'Ingredient retrieved successfully');
  } catch (err) {
    next(err);
  }
});

// PUT /ingredients/:id - Update ingredient details
router.put('/ingredients/:id', async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('primarySupplier', 'name code');
    if (!ingredient) return sendResponse(res, 404, false, null, 'Ingredient not found');
    sendResponse(res, 200, true, ingredient, 'Ingredient updated successfully');
  } catch (err) {
    next(err);
  }
});

// DELETE /ingredients/:id - Delete ingredient
router.delete('/ingredients/:id', async (req, res, next) => {
  try {
    // Check if open purchase orders reference this ingredient
    const activePO = await PurchaseOrder.findOne({
      'items.ingredient': req.params.id,
      status: { $in: ['DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'] }
    });
    if (activePO) {
      return sendResponse(res, 400, false, null, `Cannot delete ingredient: referenced in active PO ${activePO.poNumber}`);
    }

    const deleted = await Ingredient.findByIdAndDelete(req.params.id);
    if (!deleted) return sendResponse(res, 404, false, null, 'Ingredient not found');
    sendResponse(res, 200, true, { id: req.params.id }, 'Ingredient deleted successfully');
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 2. SUPPLIERS
// ==========================================
router.get('/suppliers', async (req, res, next) => {
  try {
    const { status, category } = req.query;
    let query = {};
    if (status && status !== 'ALL') query.status = status;
    if (category && category !== 'ALL') query.category = category;

    const suppliers = await Supplier.find(query).sort({ name: 1 });
    sendResponse(res, 200, true, suppliers, 'Suppliers retrieved successfully');
  } catch (err) {
    next(err);
  }
});

router.post('/suppliers', async (req, res, next) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    sendResponse(res, 201, true, supplier, 'Supplier onboarded successfully');
  } catch (err) {
    next(err);
  }
});

router.patch('/suppliers/:id/status', async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return sendResponse(res, 404, false, null, 'Supplier not found');

    supplier.status = supplier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await supplier.save();
    sendResponse(res, 200, true, supplier, `Supplier status updated to ${supplier.status}`);
  } catch (err) {
    next(err);
  }
});

// GET /suppliers/:id - Single supplier details
router.get('/suppliers/:id', async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return sendResponse(res, 404, false, null, 'Supplier not found');
    sendResponse(res, 200, true, supplier, 'Supplier retrieved successfully');
  } catch (err) {
    next(err);
  }
});

// PUT /suppliers/:id - Update supplier details
router.put('/suppliers/:id', async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!supplier) return sendResponse(res, 404, false, null, 'Supplier not found');
    sendResponse(res, 200, true, supplier, 'Supplier updated successfully');
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 3. PURCHASE ORDERS & GOODS RECEIVING
// ==========================================
router.get('/purchase-orders', async (req, res, next) => {
  try {
    const { branch, status } = req.query;
    let query = {};
    if (branch && branch !== 'all') query.branch = branch;
    if (status && status !== 'ALL') query.status = status;

    const pos = await PurchaseOrder.find(query)
      .populate('supplier', 'name code')
      .populate('items.ingredient', 'name sku baseUnit')
      .sort({ createdAt: -1 });

    sendResponse(res, 200, true, pos, 'Purchase orders retrieved');
  } catch (err) {
    next(err);
  }
});

router.post('/purchase-orders', async (req, res, next) => {
  try {
    const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const { supplier, branch, items, expectedDeliveryDate } = req.body;

    const subtotal = items.reduce((acc, it) => acc + (Number(it.orderedQty) * Number(it.unitPrice)), 0);
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const totalAmount = subtotal + tax;

    const po = new PurchaseOrder({
      poNumber,
      supplier,
      branch,
      items,
      subtotal,
      tax,
      totalAmount,
      expectedDeliveryDate,
      status: 'DRAFT'
    });
    await po.save();

    sendResponse(res, 201, true, po, 'Purchase order created in DRAFT status');
  } catch (err) {
    next(err);
  }
});

router.patch('/purchase-orders/:id/status', async (req, res, next) => {
  try {
    const { status, approvedBy } = req.body;
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return sendResponse(res, 404, false, null, 'PO not found');

    po.status = status;
    if (status === 'APPROVED') {
      po.approvedBy = approvedBy || 'Admin';
      po.approvedAt = new Date();
    }
    await po.save();
    sendResponse(res, 200, true, po, `PO status updated to ${status}`);
  } catch (err) {
    next(err);
  }
});

// GOODS RECEIVING NOTE (GRN) — INCREASES STOCK
router.post('/purchase-orders/:id/receive', async (req, res, next) => {
  try {
    const { grnNumber, receiverName, items, notes } = req.body;
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return sendResponse(res, 404, false, null, 'PO not found');

    // Duplicate check
    const duplicate = po.receiptHistory.some(r => r.grnNumber === grnNumber);
    if (duplicate) return sendResponse(res, 400, false, null, `GRN ${grnNumber} has already been processed.`);

    // Process receipt items
    for (const rItem of items) {
      const line = po.items.find(i => i.ingredient.toString() === rItem.ingredient.toString());
      if (line) {
        line.receivedQty += Number(rItem.acceptedQty || 0);
        line.rejectedQty += Number(rItem.rejectedQty || 0);
        line.damagedQty += Number(rItem.damagedQty || 0);
      }

      // ONLY acceptedQty increases stock
      const accepted = Number(rItem.acceptedQty || 0);
      if (accepted > 0) {
        const ing = await Ingredient.findById(rItem.ingredient);
        if (ing) {
          const currentStock = ing.stockByBranch.get(po.branch) || 0;
          const newStock = currentStock + accepted;
          ing.stockByBranch.set(po.branch, newStock);

          ing.batches.push({
            batchNumber: rItem.batchNumber,
            branch: po.branch,
            quantity: accepted,
            expiryDate: rItem.expiryDate,
            receivedCost: line?.unitPrice || 0
          });
          await ing.save();

          await StockMovement.create({
            type: 'GOODS_RECEIPT',
            reference: `${grnNumber} (${po.poNumber})`,
            ingredient: ing._id,
            branch: po.branch,
            deltaQty: +accepted,
            unit: ing.baseUnit,
            resultingBalance: newStock,
            performedBy: receiverName,
            notes: `Batch ${rItem.batchNumber}. ${notes || ''}`
          });
        }
      }
    }

    const allReceived = po.items.every(i => (i.receivedQty + i.rejectedQty + i.damagedQty) >= i.orderedQty);
    po.status = allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

    po.receiptHistory.unshift({
      grnNumber,
      receivedAt: new Date(),
      receivedBy: receiverName,
      notes,
      items
    });
    await po.save();

    sendResponse(res, 200, true, po, 'GRN processed and stock updated');
  } catch (err) {
    next(err);
  }
});

// GET /purchase-orders/:id - Single purchase order details
router.get('/purchase-orders/:id', async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate('supplier')
      .populate('items.ingredient', 'name sku baseUnit unitCost');
    if (!po) return sendResponse(res, 404, false, null, 'Purchase order not found');
    sendResponse(res, 200, true, po, 'Purchase order retrieved successfully');
  } catch (err) {
    next(err);
  }
});

// DELETE /purchase-orders/:id - Cancel or delete DRAFT purchase order
router.delete('/purchase-orders/:id', async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return sendResponse(res, 404, false, null, 'Purchase order not found');
    if (!['DRAFT', 'SUBMITTED'].includes(po.status)) {
      return sendResponse(res, 400, false, null, `Cannot delete PO in '${po.status}' status.`);
    }

    await PurchaseOrder.findByIdAndDelete(req.params.id);
    sendResponse(res, 200, true, { id: req.params.id }, 'Purchase order cancelled and removed');
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. TRANSFERS & WASTAGE
// ==========================================
router.get('/transfers', async (req, res, next) => {
  try {
    const { branch, status } = req.query;
    let query = {};
    if (branch && branch !== 'all') {
      query.$or = [{ fromBranch: branch }, { toBranch: branch }];
    }
    if (status && status !== 'ALL') query.status = status;

    const transfers = await StockTransfer.find(query).populate('items.ingredient', 'name sku baseUnit').sort({ createdAt: -1 });
    sendResponse(res, 200, true, transfers, 'Transfers retrieved');
  } catch (err) {
    next(err);
  }
});

router.post('/transfers/dispatch', async (req, res, next) => {
  try {
    const { fromBranch, toBranch, items, notes, dispatchedBy } = req.body;
    if (fromBranch === toBranch) {
      return sendResponse(res, 400, false, null, 'Source and destination branches cannot be the same');
    }

    const transferNumber = `TR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    // Verify stock and deduct from source branch
    for (const item of items) {
      const ing = await Ingredient.findById(item.ingredient);
      if (!ing) return sendResponse(res, 404, false, null, `Ingredient not found`);

      const current = ing.stockByBranch.get(fromBranch) || 0;
      if (current < Number(item.qty)) {
        return sendResponse(res, 400, false, null, `Insufficient stock for ${ing.name} at branch ${fromBranch}`);
      }

      const newStock = current - Number(item.qty);
      ing.stockByBranch.set(fromBranch, newStock);
      await ing.save();

      await StockMovement.create({
        type: 'TRANSFER_DISPATCH',
        reference: transferNumber,
        ingredient: ing._id,
        branch: fromBranch,
        deltaQty: -Number(item.qty),
        unit: ing.baseUnit,
        resultingBalance: newStock,
        performedBy: dispatchedBy,
        notes: `Dispatched to ${toBranch}`
      });
    }

    const transfer = new StockTransfer({
      transferNumber,
      fromBranch,
      toBranch,
      status: 'IN_TRANSIT',
      dispatchedBy,
      items,
      notes
    });
    await transfer.save();

    sendResponse(res, 201, true, transfer, 'Transfer dispatched and source stock deducted');
  } catch (err) {
    next(err);
  }
});

router.post('/transfers/:id/receive', async (req, res, next) => {
  try {
    const { receivedBy } = req.body;
    const transfer = await StockTransfer.findById(req.params.id);
    if (!transfer) return sendResponse(res, 404, false, null, 'Transfer not found');
    if (transfer.status !== 'IN_TRANSIT') return sendResponse(res, 400, false, null, 'Transfer not in transit');

    // Add stock to destination branch
    for (const item of transfer.items) {
      const ing = await Ingredient.findById(item.ingredient);
      if (ing) {
        const current = ing.stockByBranch.get(transfer.toBranch) || 0;
        const newStock = current + Number(item.qty);
        ing.stockByBranch.set(transfer.toBranch, newStock);

        ing.batches.push({
          batchNumber: item.batchNumber || 'TR-BATCH',
          branch: transfer.toBranch,
          quantity: Number(item.qty),
          expiryDate: new Date(Date.now() + 10 * 86400000),
          receivedCost: item.unitCost || ing.unitCost
        });
        await ing.save();

        await StockMovement.create({
          type: 'TRANSFER_RECEIVE',
          reference: transfer.transferNumber,
          ingredient: ing._id,
          branch: transfer.toBranch,
          deltaQty: +Number(item.qty),
          unit: ing.baseUnit,
          resultingBalance: newStock,
          performedBy: receivedBy,
          notes: `Received from ${transfer.fromBranch}`
        });
      }
    }

    transfer.status = 'RECEIVED';
    transfer.receivedAt = new Date();
    transfer.receivedBy = receivedBy;
    await transfer.save();

    sendResponse(res, 200, true, transfer, 'Transfer received and destination stock incremented');
  } catch (err) {
    next(err);
  }
});

// GET /transfers/:id - Single transfer details
router.get('/transfers/:id', async (req, res, next) => {
  try {
    const transfer = await StockTransfer.findById(req.params.id)
      .populate('items.ingredient', 'name sku baseUnit unitCost');
    if (!transfer) return sendResponse(res, 404, false, null, 'Transfer not found');
    sendResponse(res, 200, true, transfer, 'Transfer retrieved successfully');
  } catch (err) {
    next(err);
  }
});

router.get('/wastage', async (req, res, next) => {
  try {
    const { branch, reason } = req.query;
    let query = {};
    if (branch && branch !== 'all') query.branch = branch;
    if (reason && reason !== 'ALL') query.reason = reason;

    const list = await Wastage.find(query).populate('ingredient', 'name sku baseUnit').sort({ date: -1 });
    sendResponse(res, 200, true, list, 'Wastage logs retrieved');
  } catch (err) {
    next(err);
  }
});

router.post('/wastage', async (req, res, next) => {
  try {
    const { branch, ingredient: ingId, quantity, reason, notes, loggedBy } = req.body;
    const ing = await Ingredient.findById(ingId);
    if (!ing) return sendResponse(res, 404, false, null, 'Ingredient not found');

    const currentStock = ing.stockByBranch.get(branch) || 0;
    if (currentStock < Number(quantity)) {
      return sendResponse(res, 400, false, null, `Cannot discard ${quantity} ${ing.baseUnit}. Only ${currentStock} in stock.`);
    }

    const newStock = currentStock - Number(quantity);
    ing.stockByBranch.set(branch, newStock);
    await ing.save();

    const unitCost = ing.unitCost;
    const totalCost = Math.round(unitCost * Number(quantity) * 100) / 100;
    const wasteNumber = `WST-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const wastage = new Wastage({
      wasteNumber,
      branch,
      ingredient: ingId,
      quantity: Number(quantity),
      unit: ing.baseUnit,
      unitCost,
      totalCost,
      reason,
      loggedBy,
      notes
    });
    await wastage.save();

    await StockMovement.create({
      type: 'WASTAGE_DEDUCTION',
      reference: wasteNumber,
      ingredient: ing._id,
      branch,
      deltaQty: -Number(quantity),
      unit: ing.baseUnit,
      resultingBalance: newStock,
      performedBy: loggedBy,
      notes: `Reason: ${reason}. Total loss: ₹${totalCost}`
    });

    sendResponse(res, 201, true, wastage, 'Wastage logged and stock deducted');
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 5. AUDIT MOVEMENTS
// ==========================================
router.get('/movements', async (req, res, next) => {
  try {
    const { branch, type } = req.query;
    let query = {};
    if (branch && branch !== 'all') query.branch = branch;
    if (type && type !== 'ALL') query.type = type;

    const movements = await StockMovement.find(query)
      .populate('ingredient', 'name sku baseUnit')
      .sort({ timestamp: -1 })
      .limit(100);

    sendResponse(res, 200, true, movements, 'Movement audit logs retrieved');
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 6. ANALYTICS & VALUATION
// ==========================================
router.get('/analytics/kpis', async (req, res, next) => {
  try {
    const { branch = 'all' } = req.query;
    const ingredients = await Ingredient.find();
    const pos = await PurchaseOrder.find();
    const transfers = await StockTransfer.find();
    const wastages = await Wastage.find();

    let totalStockValue = 0;
    let totalItemsTracked = ingredients.length;
    let lowStockAlerts = 0;
    let outOfStockAlerts = 0;

    for (const ing of ingredients) {
      let branchStock = 0;
      if (branch === 'all') {
        for (const [_, qty] of ing.stockByBranch.entries()) {
          branchStock += Number(qty || 0);
        }
      } else {
        branchStock = Number(ing.stockByBranch.get(branch) || 0);
      }

      totalStockValue += branchStock * ing.unitCost;

      if (branchStock <= 0) {
        outOfStockAlerts++;
      } else if (branchStock <= ing.minThreshold) {
        lowStockAlerts++;
      }
    }

    const activePOs = pos.filter(p => (branch === 'all' || p.branch === branch) && ['SUBMITTED', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(p.status)).length;
    const inTransitTransfers = transfers.filter(t => (branch === 'all' || t.fromBranch === branch || t.toBranch === branch) && t.status === 'IN_TRANSIT').length;
    const totalWastageCost = wastages
      .filter(w => branch === 'all' || w.branch === branch)
      .reduce((sum, w) => sum + (w.totalCost || 0), 0);

    sendResponse(res, 200, true, {
      totalStockValue: Math.round(totalStockValue * 100) / 100,
      totalItemsTracked,
      lowStockAlerts,
      outOfStockAlerts,
      totalAlerts: lowStockAlerts + outOfStockAlerts,
      activePOs,
      inTransitTransfers,
      totalWastageCost: Math.round(totalWastageCost * 100) / 100
    }, 'Dashboard KPIs calculated');
  } catch (err) {
    next(err);
  }
});

router.get('/analytics/valuation', async (req, res, next) => {
  try {
    const { branch = 'all', method = 'FIFO' } = req.query;
    const ingredients = await Ingredient.find().sort({ name: 1 });

    let totalPortfolioValue = 0;
    const items = [];

    for (const ing of ingredients) {
      let activeBatches = ing.batches.filter(b => b.quantity > 0);
      if (branch !== 'all') {
        activeBatches = activeBatches.filter(b => b.branch === branch);
      }

      const totalQty = activeBatches.reduce((acc, b) => acc + b.quantity, 0);
      let calculatedValue = 0;

      if (method === 'FIFO') {
        const sorted = [...activeBatches].sort((a, b) => new Date(a.createdAt || a.expiryDate) - new Date(b.createdAt || b.expiryDate));
        for (const b of sorted) {
          calculatedValue += b.quantity * (b.receivedCost || ing.unitCost);
        }
      } else {
        const totalBatchCost = activeBatches.reduce((acc, b) => acc + (b.quantity * (b.receivedCost || ing.unitCost)), 0);
        const avgUnitCost = totalQty > 0 ? (totalBatchCost / totalQty) : ing.unitCost;
        calculatedValue = totalQty * avgUnitCost;
      }

      totalPortfolioValue += calculatedValue;
      items.push({
        id: ing._id,
        sku: ing.sku,
        name: ing.name,
        category: ing.category,
        unit: ing.baseUnit,
        quantity: totalQty,
        valuation: Math.round(calculatedValue * 100) / 100
      });
    }

    sendResponse(res, 200, true, {
      method,
      branch,
      totalPortfolioValue: Math.round(totalPortfolioValue * 100) / 100,
      items
    }, `Inventory valuation using ${method}`);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 7. KITCHEN CONSUMPTION
// ==========================================
router.post('/recipe/consume', async (req, res, next) => {
  try {
    const { branch, orderId, orderNumber, items, preparedBy = 'Kitchen Station' } = req.body;
    if (!branch || !items || !Array.isArray(items) || items.length === 0) {
      return sendResponse(res, 400, false, null, 'Branch and valid items array are required');
    }

    const deducted = [];
    for (const item of items) {
      const ing = await Ingredient.findById(item.ingredientId || item.ingredient);
      if (!ing) return sendResponse(res, 404, false, null, `Ingredient not found: ${item.ingredientId}`);

      const current = ing.stockByBranch.get(branch) || 0;
      const consumeQty = Number(item.quantity || item.qty);
      if (current < consumeQty) {
        return sendResponse(res, 400, false, null, `Insufficient stock for ${ing.name} at ${branch}. Available: ${current}, Required: ${consumeQty}`);
      }

      const newBalance = current - consumeQty;
      ing.stockByBranch.set(branch, newBalance);
      await ing.save();

      const movement = await StockMovement.create({
        type: 'RECIPE_CONSUMPTION',
        reference: `ORD-${orderNumber || orderId || 'POS'}`,
        ingredient: ing._id,
        branch,
        deltaQty: -consumeQty,
        unit: ing.baseUnit,
        resultingBalance: newBalance,
        performedBy: preparedBy,
        notes: `Recipe consumption for order ${orderNumber || orderId}`
      });

      deducted.push({ ingredient: ing.name, consumed: consumeQty, remaining: newBalance, movementId: movement._id });
    }

    sendResponse(res, 200, true, { deducted }, 'Recipe ingredients successfully deducted from branch inventory');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
