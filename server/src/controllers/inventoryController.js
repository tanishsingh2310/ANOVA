const mongoose = require('mongoose');
const Ingredient = require('../models/Ingredient');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const StockTransfer = require('../models/StockTransfer');
const Wastage = require('../models/Wastage');
const StockMovement = require('../models/StockMovement');
const {
  ROLES,
  ENTERPRISE_ROLES,
  INVENTORY_READ_ROLES,
  INVENTORY_WRITE_ROLES,
  PROCUREMENT_WRITE_ROLES,
  SENSITIVE_ADMIN_ROLES,
  KITCHEN_CONSUME_ROLES
} = require('../config/roles');
const { depleteBatchesFIFO, adjustBatches } = require('../utils/batchUtil');
const { UnitConversion } = require('../utils/unitConversion');

// Standard response helper
const sendResponse = (res, statusCode, success, data, message) => {
  return res.status(statusCode).json({ success, data, message });
};

// Safe Purchase Order lookup helper (supports ObjectId and poNumber)
const findPurchaseOrder = async (idOrNumber) => {
  if (!idOrNumber) return null;
  if (mongoose.Types.ObjectId.isValid(idOrNumber)) {
    const byId = await PurchaseOrder.findById(idOrNumber);
    if (byId) return byId;
  }
  return await PurchaseOrder.findOne({
    $or: [
      { poNumber: idOrNumber },
      { poNumber: String(idOrNumber).toUpperCase() }
    ]
  });
};

// Safe Stock Transfer lookup helper (supports ObjectId and transferNumber)
const findStockTransfer = async (idOrNumber) => {
  if (!idOrNumber) return null;
  if (mongoose.Types.ObjectId.isValid(idOrNumber)) {
    const byId = await StockTransfer.findById(idOrNumber);
    if (byId) return byId;
  }
  return await StockTransfer.findOne({
    $or: [
      { transferNumber: idOrNumber },
      { transferNumber: String(idOrNumber).toUpperCase() }
    ]
  });
};

// Enforce authentication across all inventory routes
async function resolveInventoryBranch(req, requestedBranch) {
  const isEnterprise = ENTERPRISE_ROLES.includes(req.user.role);

  if (isEnterprise &&
      (!requestedBranch || String(requestedBranch).toLowerCase() === 'all')) {
    return { isEnterprise, all: true, branchDoc: null, keys: [] };
  }

  const value = isEnterprise ? requestedBranch : req.user.branchId;
  if (!value) {
    const error = new Error('A valid assigned branch is required');
    error.statusCode = 403;
    throw error;
  }

  const Branch = mongoose.model('Branch');
  let branchDoc = null;

  if (mongoose.isValidObjectId(value)) {
    branchDoc = await Branch.findById(value).select('_id code isActive');
  }

  if (!branchDoc && typeof value === 'string') {
    branchDoc = await Branch.findOne({
      code: value.trim().toUpperCase()
    }).select('_id code isActive');
  }

  if (!branchDoc || !branchDoc.isActive) {
    const error = new Error('The requested branch is invalid or inactive');
    error.statusCode = 403;
    throw error;
  }

  if (!isEnterprise &&
      String(branchDoc._id) !== String(req.user.branchId)) {
    const error = new Error('You cannot access a different branch');
    error.statusCode = 403;
    throw error;
  }

  return {
    isEnterprise,
    all: false,
    branchDoc,
    keys: [String(branchDoc._id), String(branchDoc.code)]
  };
}

function getScopedBranchStock(ingredient, scope) {
  if (scope.all) {
    let total = 0;
    for (const qty of ingredient.stockByBranch.values()) {
      total += Number(qty || 0);
    }
    return total;
  }

  return scope.keys.reduce(
    (total, key) => total + Number(ingredient.stockByBranch.get(key) || 0),
    0
  );
}

function inventoryRecordMatchesBranch(record, scope, fields) {
  if (scope.all) return true;

  return fields.some((field) => {
    const value = record[field];
    if (value == null) return false;

    const values = Array.isArray(value) ? value : [value];
    return values.some((item) => scope.keys.includes(String(item)));
  });
}

function applyBranchStringFilter(query, field, scope) {
  if (scope.all) return;
  query[field] = { $in: scope.keys };
}

// ==========================================
// 1. INGREDIENTS & STOCK
// ==========================================

const getIngredients = async (req, res, next) => {
  try {
    const { branch, category, search } = req.query;
    const isEnterprise = ENTERPRISE_ROLES.includes(req.user.role);
    const Branch = mongoose.model('Branch');
    let branchDoc = null;

    if (!(isEnterprise && (!branch || String(branch).toLowerCase() === 'all'))) {
      const requestedBranch = isEnterprise ? branch : req.user.branchId;

      if (!requestedBranch) {
        return sendResponse(res, 403, false, null, 'A valid assigned branch is required');
      }

      if (mongoose.isValidObjectId(requestedBranch)) {
        branchDoc = await Branch.findById(requestedBranch).select('_id code isActive');
      }

      if (!branchDoc && typeof requestedBranch === 'string') {
        branchDoc = await Branch.findOne({
          code: requestedBranch.trim().toUpperCase()
        }).select('_id code isActive');
      }

      if (!branchDoc || !branchDoc.isActive) {
        return sendResponse(res, 403, false, null, 'The requested branch is invalid or inactive');
      }

      if (!isEnterprise && String(branchDoc._id) !== String(req.user.branchId)) {
        return sendResponse(res, 403, false, null, 'You cannot access a different branch');
      }
    }

    const query = {};
    if (category && category !== 'ALL') query.category = category;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    const ingredients = await Ingredient.find(query)
      .populate('primarySupplier', 'name code')
      .sort({ name: 1 });

    const result = ingredients.map((ingredient) => {
      const item = ingredient.toObject();
      if (!branchDoc) return item;

      const branchId = String(branchDoc._id);
      const branchCode = String(branchDoc.code);
      const stockMap = ingredient.stockByBranch;
      const stockKey = stockMap.has(branchId)
        ? branchId
        : stockMap.has(branchCode)
          ? branchCode
          : null;

      item.stockByBranch = {
        [branchCode]: stockKey ? Number(stockMap.get(stockKey) || 0) : 0
      };

      item.batches = (item.batches || []).filter((batch) =>
        String(batch.branchRef || '') === branchId ||
        String(batch.branch || '').toUpperCase() === branchCode ||
        String(batch.branch || '') === branchId
      );

      return item;
    });

    sendResponse(res, 200, true, result, 'Ingredients retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const createIngredient = async (req, res, next) => {
  try {
    const allowed = ['sku', 'name', 'category', 'baseUnit', 'unitCost', 'minThreshold', 'maxThreshold', 'reorderLevel', 'primarySupplier'];
    const data = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) data[key] = req.body[key];
    }
    const ingredient = new Ingredient(data);
    await ingredient.save();
    sendResponse(res, 201, true, ingredient, 'Ingredient registered successfully');
  } catch (err) {
    next(err);
  }
};

const adjustStock = async (req, res, next) => {
  let session;

  try {
    const { branch, newQuantity, reason, notes } = req.body;

    if (!branch || typeof reason !== 'string' || !reason.trim()) {
      return sendResponse(res, 400, false, null,
        'Branch and adjustment reason are required');
    }

    const targetQuantity = Number(newQuantity);
    if (!Number.isFinite(targetQuantity) || targetQuantity < 0) {
      return sendResponse(res, 400, false, null,
        'New quantity must be a finite non-negative number');
    }

    const Branch = mongoose.model('Branch');
    const branchValue = String(branch).trim();
    let branchDoc = null;

    if (mongoose.isValidObjectId(branchValue)) {
      branchDoc = await Branch.findById(branchValue)
        .select('_id code isActive');
    }

    if (!branchDoc) {
      branchDoc = await Branch.findOne({
        code: branchValue.toUpperCase()
      }).select('_id code isActive');
    }

    if (!branchDoc || !branchDoc.isActive) {
      return sendResponse(res, 403, false, null,
        'The requested branch is invalid or inactive');
    }

    const branchId = String(branchDoc._id);
    const branchCode = String(branchDoc.code);
    const branchKeys = [branchId, branchCode];

    session = await mongoose.startSession();
    let result;

    await session.withTransaction(async () => {
      const ingredient = await Ingredient.findById(req.params.id)
        .session(session);

      if (!ingredient) {
        const error = new Error('Ingredient not found');
        error.statusCode = 404;
        throw error;
      }

      const stockMap = ingredient.stockByBranch;
      const stockKey = stockMap.has(branchId)
        ? branchId
        : stockMap.has(branchCode)
          ? branchCode
          : branchId;

      const previousQty = Number(stockMap.get(stockKey) || 0);

      if (!Number.isFinite(previousQty) || previousQty < 0) {
        const error = new Error('Existing stock balance is invalid');
        error.statusCode = 409;
        throw error;
      }

      const delta = targetQuantity - previousQty;

      if (delta < 0) {
        depleteBatchesFIFO(
          ingredient.batches,
          branchKeys,
          Math.abs(delta)
        );
      } else if (delta > 0) {
        adjustBatches(
          ingredient.batches,
          stockKey,
          delta,
          ingredient.unitCost,
          reason.trim()
        );

        const adjustmentBatch =
          ingredient.batches[ingredient.batches.length - 1];

        if (adjustmentBatch) {
          adjustmentBatch.branchRef = branchDoc._id;
        }
      }

      stockMap.set(stockKey, targetQuantity);
      await ingredient.save({ session });

      const [movement] = await StockMovement.create([{
        type: 'STOCK_ADJUSTMENT',
        reference: `ADJ-${new mongoose.Types.ObjectId()}`,
        ingredient: ingredient._id,
        branch: stockKey,
        branchRef: branchDoc._id,
        deltaQty: delta,
        unit: ingredient.baseUnit,
        resultingBalance: targetQuantity,
        performedBy: String(req.user._id),
        performedByUser: req.user._id,
        notes: notes
          ? `${reason.trim()}: ${String(notes)}`
          : reason.trim()
      }], { session });

      result = { ingredient, movement };
    });

    return sendResponse(res, 200, true, result,
      'Stock adjusted with audit trail');
  } catch (err) {
    if (err.statusCode) {
      return sendResponse(res, err.statusCode, false, null, err.message);
    }
    return next(err);
  } finally {
    if (session) await session.endSession();
  }
};

const getExpiringBatches = async (req, res, next) => {
  try {
    const days = Math.max(0, Math.min(Number(req.query.days) || 7, 365));
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    const scope = await resolveInventoryBranch(req, req.query.branch);
    const ingredients = await Ingredient.find({
      'batches.expiryDate': { $lte: targetDate }
    });

    const result = [];
    for (const ing of ingredients) {
      for (const batch of ing.batches) {
        if (!(batch.quantity > 0) || batch.expiryDate > targetDate) continue;

        if (!scope.all) {
          const branchMatches =
            String(batch.branchRef || '') === String(scope.branchDoc._id) ||
            scope.keys.includes(String(batch.branch));
          if (!branchMatches) continue;
        }

        const diffDays = Math.ceil(
          (new Date(batch.expiryDate).getTime() - Date.now()) / 86400000
        );

        result.push({
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

    result.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    sendResponse(res, 200, true, result, 'Expiring batches retrieved');
  } catch (err) {
    if (err.statusCode) {
      return sendResponse(res, err.statusCode, false, null, err.message);
    }
    next(err);
  }
};

const getIngredientById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendResponse(res, 400, false, null, 'Invalid ingredient ID');
    }

    const isEnterprise = ENTERPRISE_ROLES.includes(req.user.role);
    const requestedBranch = isEnterprise ? req.query.branch : req.user.branchId;
    const Branch = mongoose.model('Branch');
    let branchDoc = null;

    if (!(isEnterprise && (!requestedBranch || String(requestedBranch).toLowerCase() === 'all'))) {
      if (!requestedBranch) {
        return sendResponse(res, 403, false, null, 'A valid assigned branch is required');
      }

      if (mongoose.isValidObjectId(requestedBranch)) {
        branchDoc = await Branch.findById(requestedBranch).select('_id code isActive');
      }

      if (!branchDoc && typeof requestedBranch === 'string') {
        branchDoc = await Branch.findOne({
          code: requestedBranch.trim().toUpperCase()
        }).select('_id code isActive');
      }

      if (!branchDoc || !branchDoc.isActive) {
        return sendResponse(res, 403, false, null, 'The requested branch is invalid or inactive');
      }

      if (!isEnterprise && String(branchDoc._id) !== String(req.user.branchId)) {
        return sendResponse(res, 403, false, null, 'You cannot access a different branch');
      }
    }

    const ingredient = await Ingredient.findById(req.params.id)
      .populate('primarySupplier', 'name code city');

    if (!ingredient) {
      return sendResponse(res, 404, false, null, 'Ingredient not found');
    }

    const item = ingredient.toObject();

    if (branchDoc) {
      const branchId = String(branchDoc._id);
      const branchCode = String(branchDoc.code);
      const stockMap = ingredient.stockByBranch;
      const stockKey = stockMap.has(branchId)
        ? branchId
        : stockMap.has(branchCode)
          ? branchCode
          : null;

      item.stockByBranch = {
        [branchCode]: stockKey ? Number(stockMap.get(stockKey) || 0) : 0
      };

      item.batches = (item.batches || []).filter((batch) =>
        String(batch.branchRef || '') === branchId ||
        String(batch.branch || '').toUpperCase() === branchCode ||
        String(batch.branch || '') === branchId
      );
    }

    sendResponse(res, 200, true, item, 'Ingredient retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const updateIngredient = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendResponse(res, 400, false, null, 'Invalid ingredient ID');
    }

    const allowedFields = [
      'sku',
      'name',
      'category',
      'baseUnit',
      'unitCost',
      'minThreshold',
      'maxThreshold',
      'reorderLevel',
      'primarySupplier'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return sendResponse(res, 400, false, null, 'No editable ingredient fields were provided');
    }

    const ingredient = await Ingredient.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('primarySupplier', 'name code');

    if (!ingredient) {
      return sendResponse(res, 404, false, null, 'Ingredient not found');
    }

    sendResponse(res, 200, true, ingredient, 'Ingredient updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteIngredient = async (req, res, next) => {
  try {
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
};

// ==========================================
// 2. SUPPLIERS
// ==========================================

const getSuppliers = async (req, res, next) => {
  try {
    const { status, category } = req.query;
    const query = {};

    if (status && status !== 'ALL') query.status = status;
    if (category && category !== 'ALL') query.category = category;

    if (req.user.role === ROLES.SUPPLIER) {
      query.user = req.user.id;
    } else if (!INVENTORY_READ_ROLES.includes(req.user.role) &&
               !ENTERPRISE_ROLES.includes(req.user.role)) {
      return sendResponse(res, 403, false, null, 'You do not have permission to view suppliers');
    }

    const suppliers = await Supplier.find(query).sort({ name: 1 });
    sendResponse(res, 200, true, suppliers, 'Suppliers retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const createSupplier = async (req, res, next) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    sendResponse(res, 201, true, supplier, 'Supplier onboarded successfully');
  } catch (err) {
    next(err);
  }
};

const updateSupplierStatus = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return sendResponse(res, 404, false, null, 'Supplier not found');

    supplier.status = supplier.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await supplier.save();
    sendResponse(res, 200, true, supplier, `Supplier status updated to ${supplier.status}`);
  } catch (err) {
    next(err);
  }
};

const getSupplierById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendResponse(res, 400, false, null, 'Invalid supplier ID');
    }

    const isSupplier = req.user.role === ROLES.SUPPLIER;
    const isAllowedStaff = INVENTORY_READ_ROLES.includes(req.user.role) ||
      ENTERPRISE_ROLES.includes(req.user.role);

    if (!isSupplier && !isAllowedStaff) {
      return sendResponse(res, 403, false, null, 'You do not have permission to view supplier details');
    }

    const query = { _id: req.params.id };
    if (isSupplier) query.user = req.user.id;

    const supplier = await Supplier.findOne(query);
    if (!supplier) {
      return sendResponse(res, 404, false, null, 'Supplier not found');
    }

    sendResponse(res, 200, true, supplier, 'Supplier retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const updateSupplier = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendResponse(res, 400, false, null, 'Invalid supplier ID');
    }

    const allowedFields = [
      'name',
      'category',
      'contactPerson',
      'email',
      'phone',
      'city',
      'leadTimeDays',
      'paymentTerms',
      'taxId'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return sendResponse(res, 400, false, null, 'No editable supplier fields were provided');
    }

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return sendResponse(res, 404, false, null, 'Supplier not found');
    }

    sendResponse(res, 200, true, supplier, 'Supplier updated successfully');
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 3. PURCHASE ORDERS & GOODS RECEIVING
// ==========================================

const getPurchaseOrders = async (req, res, next) => {
  try {
    const { branch, status } = req.query;
    const query = {};

    if (status && status !== 'ALL') query.status = status;

    if (req.user.role === ROLES.SUPPLIER) {
      const supplier = await Supplier.findOne({ user: req.user.id }).select('_id');
      if (!supplier) {
        return sendResponse(res, 200, true, [], 'No supplier account is linked to this user');
      }
      query.supplier = supplier._id;
    } else {
      const allowed = INVENTORY_READ_ROLES.includes(req.user.role) ||
        ENTERPRISE_ROLES.includes(req.user.role);
      if (!allowed) {
        return sendResponse(res, 403, false, null, 'You do not have permission to view purchase orders');
      }

      const scope = await resolveInventoryBranch(req, branch);
      if (!scope.all) {
        query.$or = [
          { branch: { $in: scope.keys } },
          { branchRef: scope.branchDoc._id }
        ];
      }
    }

    const pos = await PurchaseOrder.find(query)
      .populate('supplier', 'name code')
      .populate('items.ingredient', 'name sku baseUnit')
      .sort({ createdAt: -1 });

    sendResponse(res, 200, true, pos, 'Purchase orders retrieved');
  } catch (err) {
    if (err.statusCode) {
      return sendResponse(res, err.statusCode, false, null, err.message);
    }
    next(err);
  }
};

const createPurchaseOrder = async (req, res, next) => {
  try {
    const poNumber = req.body.poNumber || `PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const { supplier, branch, items, expectedDeliveryDate, expectedDate, notes } = req.body;
    const finalExpectedDate = expectedDeliveryDate || expectedDate;

    if (!branch || String(branch).toLowerCase() === 'all') {
      return sendResponse(res, 400, false, null, 'A specific branch is required');
    }
    if (!Array.isArray(items) || items.length === 0) {
      return sendResponse(res, 400, false, null, 'At least one purchase-order item is required');
    }
    if (!supplier) {
      return sendResponse(res, 400, false, null, 'A valid supplier is required');
    }

    let supplierDoc = null;
    if (mongoose.Types.ObjectId.isValid(supplier)) {
      supplierDoc = await Supplier.findById(supplier);
    }
    if (!supplierDoc) {
      supplierDoc = await Supplier.findOne({
        $or: [{ code: supplier }, { name: supplier }]
      });
    }
    if (!supplierDoc) {
      return sendResponse(res, 400, false, null, 'Invalid supplier selected');
    }

    const scope = await resolveInventoryBranch(req, branch);
    if (scope.all || !scope.branchDoc) {
      return sendResponse(res, 400, false, null, 'A specific branch is required');
    }

    let calculatedTotal = 0;
    const poItems = [];

    for (const item of items) {
      const ingId = item.ingredient || item.ingredientId;
      if (!ingId) {
        return sendResponse(res, 400, false, null, 'Ingredient is required for all items');
      }

      let ingredientDoc = null;
      if (mongoose.Types.ObjectId.isValid(ingId)) {
        ingredientDoc = await Ingredient.findById(ingId);
      }
      if (!ingredientDoc) {
        ingredientDoc = await Ingredient.findOne({
          $or: [{ sku: ingId }, { name: ingId }]
        });
      }
      if (!ingredientDoc) {
        return sendResponse(res, 400, false, null, `Ingredient ${ingId} not found`);
      }

      const orderedQty = Number(item.orderedQty !== undefined ? item.orderedQty : item.quantity);
      if (!Number.isFinite(orderedQty) || orderedQty <= 0) {
        return sendResponse(res, 400, false, null, `Invalid ordered quantity for ${ingredientDoc.name}`);
      }

      const unitPrice = Number(item.unitPrice !== undefined ? item.unitPrice : ingredientDoc.unitCost);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return sendResponse(res, 400, false, null, `Invalid unit price for ${ingredientDoc.name}`);
      }

      const lineTotal = orderedQty * unitPrice;
      calculatedTotal += lineTotal;

      poItems.push({
        ingredient: ingredientDoc._id,
        orderedQty,
        unit: item.unit || ingredientDoc.baseUnit,
        unitPrice,
        totalCost: lineTotal,
        receivedQty: 0
      });
    }

    const po = new PurchaseOrder({
      poNumber,
      supplier: supplierDoc._id,
      branch: String(scope.branchDoc.code || branch),
      branchRef: scope.branchDoc._id,
      status: req.body.status || 'SUBMITTED',
      items: poItems,
      totalAmount: calculatedTotal,
      expectedDeliveryDate: finalExpectedDate ? new Date(finalExpectedDate) : new Date(Date.now() + 86400000 * 3),
      notes: notes || '',
      createdBy: String(req.user._id),
      createdByUser: req.user._id
    });

    await po.save();
    return sendResponse(res, 201, true, po, 'Purchase order drafted and submitted successfully');
  } catch (err) {
    if (err.statusCode) {
      return sendResponse(res, err.statusCode, false, null, err.message);
    }
    next(err);
  }
};

const approvePurchaseOrder = async (req, res, next) => {
  try {
    const po = await findPurchaseOrder(req.params.id);
    if (!po) return sendResponse(res, 404, false, null, 'Purchase order not found');

    if (po.status !== 'SUBMITTED') {
      return sendResponse(res, 400, false, null, 'Only submitted purchase orders can be approved');
    }

    po.status = 'APPROVED';
    po.approvedBy = String(req.user._id);
    po.approvedByUser = req.user._id;
    po.approvedAt = new Date();
    await po.save();

    return sendResponse(res, 200, true, po, 'Purchase order approved');
  } catch (err) {
    next(err);
  }
};

const updatePurchaseOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowedTransitions = {
      DRAFT: ['SUBMITTED', 'CANCELLED'],
      SUBMITTED: ['DRAFT', 'CANCELLED'],
      APPROVED: ['ORDERED', 'CANCELLED'],
      ORDERED: ['CANCELLED']
    };

    if (typeof status !== 'string' || !Object.prototype.hasOwnProperty.call(allowedTransitions, status)) {
      return sendResponse(res, 400, false, null, 'Invalid purchase-order status');
    }

    const po = await findPurchaseOrder(req.params.id);
    if (!po) return sendResponse(res, 404, false, null, 'Purchase order not found');

    if (!(allowedTransitions[po.status] || []).includes(status)) {
      return sendResponse(res, 400, false, null, `Status transition from ${po.status} to ${status} is not allowed`);
    }

    po.status = status;
    await po.save();

    return sendResponse(res, 200, true, po, `Purchase order status updated to ${status}`);
  } catch (err) {
    next(err);
  }
};

const receivePurchaseOrder = async (req, res, next) => {
  try {
    const { grnNumber, items, notes } = req.body;
    const po = await findPurchaseOrder(req.params.id);

    if (!po) {
      return sendResponse(res, 404, false, null, 'Purchase order not found');
    }

    if (!['APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
      return sendResponse(res, 400, false, null, 'Only approved or ordered purchase orders can be received');
    }

    if (typeof grnNumber !== 'string' || !grnNumber.trim()) {
      return sendResponse(res, 400, false, null, 'A GRN number is required');
    }

    if (!Array.isArray(items) || items.length === 0) {
      return sendResponse(res, 400, false, null, 'At least one receipt item is required');
    }

    const normalizedGrn = grnNumber.trim();
    if (po.receiptHistory.some(r =>
      String(r.grnNumber).toUpperCase() === normalizedGrn.toUpperCase()
    )) {
      return sendResponse(res, 400, false, null, `GRN ${normalizedGrn} has already been processed`);
    }

    let branchDoc = null;
    if (mongoose.isValidObjectId(po.branch)) {
      branchDoc = await mongoose.model('Branch')
        .findById(po.branch)
        .select('_id code isActive');
    }
    if (!branchDoc) {
      branchDoc = await mongoose.model('Branch')
        .findOne({ code: String(po.branch).trim().toUpperCase() })
        .select('_id code isActive');
    }

    if (!branchDoc || !branchDoc.isActive) {
      return sendResponse(res, 400, false, null, 'The purchase order references an invalid or inactive branch');
    }

    if (!ENTERPRISE_ROLES.includes(req.user.role) &&
        String(branchDoc._id) !== String(req.user.branchId || '')) {
      return sendResponse(res, 403, false, null, 'You cannot receive goods for a different branch');
    }

    const validatedItems = [];
    const totalsByLine = new Map();

    for (const item of items) {
      const ingredientId = item?.ingredient || item?.ingredientId;
      if (!ingredientId || !mongoose.isValidObjectId(ingredientId)) {
        return sendResponse(res, 400, false, null, 'Each receipt item must specify a valid ingredient ID');
      }

      const line = po.items.find(i => String(i.ingredient) === String(ingredientId));
      if (!line) {
        return sendResponse(res, 400, false, null, `Ingredient ${ingredientId} is not part of this purchase order`);
      }

      const acceptedQty = Number(item.acceptedQty ?? 0);
      const rejectedQty = Number(item.rejectedQty ?? 0);
      const damagedQty = Number(item.damagedQty ?? 0);

      if (![acceptedQty, rejectedQty, damagedQty].every(
        q => Number.isFinite(q) && q >= 0
      ) || acceptedQty + rejectedQty + damagedQty <= 0) {
        return sendResponse(res, 400, false, null, 'Receipt quantities must be non-negative numbers with a positive total');
      }

      if (acceptedQty > 0 &&
          (typeof item.batchNumber !== 'string' || !item.batchNumber.trim() ||
           !item.expiryDate || !Number.isFinite(Date.parse(item.expiryDate)))) {
        return sendResponse(res, 400, false, null, 'Accepted stock requires a batch number and valid expiry date');
      }

      const alreadyCounted = totalsByLine.get(String(line._id)) || 0;
      const thisTotal = acceptedQty + rejectedQty + damagedQty;
      const priorTotal = Number(line.receivedQty || 0) +
        Number(line.rejectedQty || 0) + Number(line.damagedQty || 0);

      if (priorTotal + alreadyCounted + thisTotal > Number(line.orderedQty)) {
        return sendResponse(res, 400, false, null, `Receipt exceeds the remaining ordered quantity for ingredient ${ingredientId}`);
      }

      const ingredientDoc = await Ingredient.findById(ingredientId);
      if (!ingredientDoc) {
        return sendResponse(res, 400, false, null, `Ingredient ${ingredientId} was not found`);
      }

      totalsByLine.set(String(line._id), alreadyCounted + thisTotal);
      validatedItems.push({
        ingredientDoc,
        line,
        acceptedQty,
        rejectedQty,
        damagedQty,
        batchNumber: item.batchNumber ? item.batchNumber.trim() : '',
        expiryDate: item.expiryDate || null
      });
    }

    const stockBranchKey = String(po.branch);
    for (const entry of validatedItems) {
      const { ingredientDoc, line, acceptedQty, rejectedQty, damagedQty } = entry;

      line.receivedQty = Number(line.receivedQty || 0) + acceptedQty;
      line.rejectedQty = Number(line.rejectedQty || 0) + rejectedQty;
      line.damagedQty = Number(line.damagedQty || 0) + damagedQty;

      if (acceptedQty <= 0) continue;

      const currentStock = Number(ingredientDoc.stockByBranch.get(stockBranchKey) || 0);
      const newStock = currentStock + acceptedQty;
      ingredientDoc.stockByBranch.set(stockBranchKey, newStock);

      ingredientDoc.batches.push({
        batchNumber: entry.batchNumber,
        branch: stockBranchKey,
        branchRef: branchDoc._id,
        quantity: acceptedQty,
        expiryDate: new Date(entry.expiryDate),
        receivedCost: Number(line.unitPrice || 0)
      });

      await ingredientDoc.save();

      await StockMovement.create({
        type: 'GOODS_RECEIPT',
        reference: `${normalizedGrn} (${po.poNumber})`,
        ingredient: ingredientDoc._id,
        branch: stockBranchKey,
        branchRef: branchDoc._id,
        deltaQty: acceptedQty,
        unit: ingredientDoc.baseUnit,
        resultingBalance: newStock,
        performedBy: String(req.user._id),
        notes: `Batch ${entry.batchNumber}. ${notes || ''}`
      });
    }

    const allReceived = po.items.every(i =>
      Number(i.receivedQty || 0) +
      Number(i.rejectedQty || 0) +
      Number(i.damagedQty || 0) >= Number(i.orderedQty)
    );

    po.status = allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
    po.branchRef = branchDoc._id;
    po.receiptHistory.unshift({
      grnNumber: normalizedGrn,
      receivedAt: new Date(),
      receivedBy: String(req.user._id),
      receivedByUser: req.user._id,
      notes: notes || '',
      items: validatedItems.map(entry => ({
        ingredient: entry.ingredientDoc._id,
        acceptedQty: entry.acceptedQty,
        rejectedQty: entry.rejectedQty,
        damagedQty: entry.damagedQty,
        batchNumber: entry.batchNumber || 'NOT-ACCEPTED',
        expiryDate: entry.expiryDate || new Date()
      }))
    });

    await po.save();
    return sendResponse(res, 200, true, po, 'GRN processed and stock updated');
  } catch (err) {
    next(err);
  }
};

const getPurchaseOrderById = async (req, res, next) => {
  try {
    const isSupplier = req.user.role === ROLES.SUPPLIER;
    const allowedStaff = INVENTORY_READ_ROLES.includes(req.user.role) ||
      ENTERPRISE_ROLES.includes(req.user.role);

    if (!isSupplier && !allowedStaff) {
      return sendResponse(res, 403, false, null, 'You do not have permission to view purchase orders');
    }

    const po = await findPurchaseOrder(req.params.id);
    if (!po) return sendResponse(res, 404, false, null, 'Purchase order not found');

    if (isSupplier) {
      const supplier = await Supplier.findOne({ user: req.user.id }).select('_id');
      if (!supplier || String(po.supplier) !== String(supplier._id)) {
        return sendResponse(res, 404, false, null, 'Purchase order not found');
      }
    } else {
      const scope = await resolveInventoryBranch(req, req.query.branch);
      if (!scope.all) {
        const matches = scope.keys.includes(String(po.branch)) ||
          String(po.branchRef || '') === String(scope.branchDoc._id);
        if (!matches) {
          return sendResponse(res, 404, false, null, 'Purchase order not found');
        }
      }
    }

    await po.populate('supplier', 'name code');
    await po.populate('items.ingredient', 'name sku baseUnit unitCost');
    sendResponse(res, 200, true, po, 'Purchase order retrieved successfully');
  } catch (err) {
    if (err.statusCode) {
      return sendResponse(res, err.statusCode, false, null, err.message);
    }
    next(err);
  }
};

const deletePurchaseOrder = async (req, res, next) => {
  try {
    const po = await findPurchaseOrder(req.params.id);
    if (!po) return sendResponse(res, 404, false, null, 'Purchase order not found');
    if (!['DRAFT', 'SUBMITTED'].includes(po.status)) {
      return sendResponse(res, 400, false, null, `Cannot delete PO in '${po.status}' status.`);
    }

    await PurchaseOrder.findByIdAndDelete(po._id);
    sendResponse(res, 200, true, { id: req.params.id }, 'Purchase order cancelled and removed');
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 4. TRANSFERS & WASTAGE
// ==========================================

const getTransfers = async (req, res, next) => {
  try {
    const { branch, status } = req.query;
    const query = {};
    if (status && status !== 'ALL') query.status = status;

    const scope = await resolveInventoryBranch(req, branch);
    if (!scope.all) {
      query.$or = [
        { fromBranch: { $in: scope.keys } },
        { toBranch: { $in: scope.keys } },
        { fromBranchRef: scope.branchDoc._id },
        { toBranchRef: scope.branchDoc._id }
      ];
    }

    const transfers = await StockTransfer.find(query)
      .populate('items.ingredient', 'name sku baseUnit')
      .sort({ createdAt: -1 });

    sendResponse(res, 200, true, transfers, 'Transfers retrieved');
  } catch (err) {
    if (err.statusCode) {
      return sendResponse(res, err.statusCode, false, null, err.message);
    }
    next(err);
  }
};

const dispatchTransfer = async (req, res, next) => {
  let session;

  try {
    const { fromBranch, toBranch, items, notes } = req.body;

    function fail(status, message) {
      const error = new Error(message);
      error.statusCode = status;
      throw error;
    }

    if (typeof fromBranch !== 'string' || !fromBranch.trim() ||
        typeof toBranch !== 'string' || !toBranch.trim()) {
      fail(400, 'Source and destination branches are required');
    }

    const sourceKey = fromBranch.trim();
    const destinationKey = toBranch.trim();

    if (sourceKey === destinationKey) {
      fail(400, 'Source and destination branches cannot be the same');
    }

    if (!Array.isArray(items) || items.length === 0) {
      fail(400, 'At least one transfer item is required');
    }

    const seenIngredients = new Set();
    const normalizedItems = items.map((item) => {
      if (!item || !mongoose.isValidObjectId(item.ingredient)) {
        fail(400, 'Each item must contain a valid ingredient ID');
      }

      const ingredientId = String(item.ingredient);
      if (seenIngredients.has(ingredientId)) {
        fail(400, 'Use only one line per ingredient in a transfer');
      }
      seenIngredients.add(ingredientId);

      const qty = Number(item.qty);
      if (!Number.isFinite(qty) || qty <= 0) {
        fail(400, 'Transfer quantities must be positive finite numbers');
      }

      if (typeof item.batchNumber !== 'string' || !item.batchNumber.trim()) {
        fail(400, 'A source batch number is required for every item');
      }

      return {
        ingredient: ingredientId,
        qty,
        batchNumber: item.batchNumber.trim()
      };
    });

    const transferNumber = typeof req.body.transferNumber === 'string' &&
      req.body.transferNumber.trim()
      ? req.body.transferNumber.trim().toUpperCase()
      : `TR-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`;

    session = await mongoose.startSession();
    let createdTransfer;

    await session.withTransaction(async () => {
      const Branch = mongoose.model('Branch');

      async function resolveBranch(value) {
        let branch = null;

        if (mongoose.isValidObjectId(value)) {
          branch = await Branch.findById(value).session(session);
        }

        if (!branch) {
          branch = await Branch.findOne({
            code: value.toUpperCase()
          }).session(session);
        }

        if (!branch || !branch.isActive) {
          fail(400, `Branch "${value}" is invalid or inactive`);
        }

        return branch;
      }

      const sourceBranch = await resolveBranch(sourceKey);
      const destinationBranch = await resolveBranch(destinationKey);

      if (String(sourceBranch._id) === String(destinationBranch._id)) {
        fail(400, 'Source and destination branches cannot be the same');
      }

      const prepared = [];

      for (const item of normalizedItems) {
        const ingredient = await Ingredient.findById(item.ingredient).session(session);

        if (!ingredient) {
          fail(404, `Ingredient ${item.ingredient} was not found`);
        }

        if (ingredient.baseUnit !== (items.find(
          original => String(original.ingredient) === item.ingredient
        )?.unit)) {
          fail(400, `Transfer unit must match the base unit (${ingredient.baseUnit}) for ${ingredient.name}`);
        }

        const currentStock = Number(ingredient.stockByBranch.get(sourceKey) || 0);

        if (!Number.isFinite(currentStock) || currentStock < item.qty) {
          fail(400, `Insufficient stock for ${ingredient.name} at branch ${sourceKey}`);
        }

        const batch = ingredient.batches.find((entry) =>
          entry.batchNumber === item.batchNumber &&
          entry.branch === sourceKey &&
          Number(entry.quantity) > 0
        );

        if (!batch || !Number.isFinite(Number(batch.quantity)) ||
            Number(batch.quantity) < item.qty) {
          fail(400, `Batch ${item.batchNumber} does not have enough quantity at the source branch for ${ingredient.name}`);
        }

        prepared.push({
          item,
          ingredient,
          currentStock,
          batch
        });
      }

      for (const entry of prepared) {
        const { item, ingredient, currentStock } = entry;
        const deducted = depleteBatchesFIFO(
          ingredient.batches,
          sourceKey,
          item.qty,
          item.batchNumber
        );

        if (Math.abs(deducted - item.qty) > 1e-8) {
          fail(409, `Batch deduction mismatch for ${ingredient.name}`);
        }

        const newStock = currentStock - item.qty;
        ingredient.stockByBranch.set(sourceKey, newStock);
        await ingredient.save({ session });

        await StockMovement.create([{
          type: 'TRANSFER_DISPATCH',
          reference: transferNumber,
          ingredient: ingredient._id,
          branch: sourceKey,
          branchRef: sourceBranch._id,
          deltaQty: -item.qty,
          unit: ingredient.baseUnit,
          resultingBalance: newStock,
          performedBy: String(req.user._id),
          performedByUser: req.user._id,
          notes: `Dispatched to ${destinationKey}. Batch ${item.batchNumber}. ${notes || ''}`
        }], { session });
      }

      createdTransfer = new StockTransfer({
        transferNumber,
        fromBranch: sourceKey,
        toBranch: destinationKey,
        fromBranchRef: sourceBranch._id,
        toBranchRef: destinationBranch._id,
        status: 'IN_TRANSIT',
        dispatchedBy: String(req.user._id),
        dispatchedByUser: req.user._id,
        items: prepared.map(({ item, ingredient }) => ({
          ingredient: ingredient._id,
          qty: item.qty,
          unit: ingredient.baseUnit,
          unitCost: ingredient.unitCost,
          batchNumber: item.batchNumber
        })),
        notes
      });

      await createdTransfer.save({ session });
    });

    return sendResponse(
      res,
      201,
      true,
      createdTransfer,
      'Transfer dispatched and source stock deducted'
    );
  } catch (err) {
    if (err.statusCode) {
      return sendResponse(res, err.statusCode, false, null, err.message);
    }
    return next(err);
  } finally {
    if (session) await session.endSession();
  }
};

const receiveTransfer = async (req, res, next) => {
  let session;

  try {
    function fail(status, message) {
      const error = new Error(message);
      error.statusCode = status;
      throw error;
    }

    const existingTransfer = await findStockTransfer(req.params.id);
    if (!existingTransfer) {
      return sendResponse(res, 404, false, null, 'Transfer not found');
    }

    session = await mongoose.startSession();
    let receivedTransfer;

    await session.withTransaction(async () => {
      const transfer = await StockTransfer.findById(existingTransfer._id).session(session);

      if (!transfer) {
        fail(404, 'Transfer not found');
      }
      if (transfer.status !== 'IN_TRANSIT') {
        fail(409, 'Transfer is no longer in transit');
      }
      if (!Array.isArray(transfer.items) || transfer.items.length === 0) {
        fail(400, 'Transfer has no items to receive');
      }

      const Branch = mongoose.model('Branch');
      let destinationBranch = null;

      if (transfer.toBranchRef && mongoose.isValidObjectId(transfer.toBranchRef)) {
        destinationBranch = await Branch.findById(transfer.toBranchRef)
          .select('_id code isActive')
          .session(session);
      }

      if (!destinationBranch && mongoose.isValidObjectId(transfer.toBranch)) {
        destinationBranch = await Branch.findById(transfer.toBranch)
          .select('_id code isActive')
          .session(session);
      }

      if (!destinationBranch) {
        destinationBranch = await Branch.findOne({
          code: String(transfer.toBranch).trim().toUpperCase()
        }).select('_id code isActive').session(session);
      }

      if (!destinationBranch || !destinationBranch.isActive) {
        fail(400, 'Transfer destination is invalid or inactive');
      }

      if (!ENTERPRISE_ROLES.includes(req.user.role) &&
          String(destinationBranch._id) !== String(req.user.branchId || '')) {
        fail(403, 'You can only receive transfers for your assigned branch');
      }

      const destinationKey = String(transfer.toBranch);
      const validatedItems = [];
      const seenIngredients = new Set();

      for (const item of transfer.items) {
        const qty = Number(item.qty);

        if (!item.ingredient || !mongoose.isValidObjectId(item.ingredient) ||
            !Number.isFinite(qty) || qty <= 0) {
          fail(400, 'Transfer contains an invalid ingredient or quantity');
        }

        if (!item.batchNumber || !String(item.batchNumber).trim()) {
          fail(400, 'Transfer item is missing its source batch number');
        }

        const ingredientId = String(item.ingredient);
        if (seenIngredients.has(ingredientId)) {
          fail(400, 'Transfer contains duplicate ingredient lines');
        }
        seenIngredients.add(ingredientId);

        const ingredient = await Ingredient.findById(ingredientId).session(session);
        if (!ingredient) {
          fail(400, `Ingredient ${ingredientId} was not found`);
        }

        const sourceBatch = ingredient.batches.find(batch =>
          String(batch.batchNumber) === String(item.batchNumber).trim() &&
          String(batch.branch) === String(transfer.fromBranch) &&
          batch.expiryDate &&
          Number.isFinite(new Date(batch.expiryDate).getTime())
        );

        if (!sourceBatch) {
          fail(400, `Cannot verify expiry for batch ${item.batchNumber}`);
        }

        validatedItems.push({
          item,
          ingredient,
          qty,
          expiryDate: new Date(sourceBatch.expiryDate),
          batchNumber: String(item.batchNumber).trim()
        });
      }

      for (const entry of validatedItems) {
        const { item, ingredient, qty, expiryDate, batchNumber } = entry;
        const current = Number(ingredient.stockByBranch.get(destinationKey) || 0);

        if (!Number.isFinite(current) || current < 0) {
          fail(409, `Invalid destination stock balance for ${ingredient.name}`);
        }

        const newStock = current + qty;
        ingredient.stockByBranch.set(destinationKey, newStock);

        ingredient.batches.push({
          batchNumber,
          branch: destinationKey,
          branchRef: destinationBranch._id,
          quantity: qty,
          expiryDate,
          receivedCost: Number(item.unitCost ?? ingredient.unitCost ?? 0)
        });

        await ingredient.save({ session });

        await StockMovement.create([{
          type: 'TRANSFER_RECEIVE',
          reference: transfer.transferNumber,
          ingredient: ingredient._id,
          branch: destinationKey,
          branchRef: destinationBranch._id,
          deltaQty: qty,
          unit: ingredient.baseUnit,
          resultingBalance: newStock,
          performedBy: String(req.user._id),
          performedByUser: req.user._id,
          notes: `Received from ${transfer.fromBranch}. Batch ${batchNumber}`
        }], { session });
      }

      transfer.toBranchRef = destinationBranch._id;
      transfer.status = 'RECEIVED';
      transfer.receivedAt = new Date();
      transfer.receivedBy = String(req.user._id);
      transfer.receivedByUser = req.user._id;

      await transfer.save({ session });
      receivedTransfer = transfer;
    });

    return sendResponse(
      res,
      200,
      true,
      receivedTransfer,
      'Transfer received and destination stock incremented'
    );
  } catch (err) {
    if (err.statusCode) {
      return sendResponse(res, err.statusCode, false, null, err.message);
    }
    return next(err);
  } finally {
    if (session) await session.endSession();
  }
};

const getTransferById = async (req, res, next) => {
  try {
    const transfer = await findStockTransfer(req.params.id);
    if (!transfer) return sendResponse(res, 404, false, null, 'Transfer not found');

    const scope = await resolveInventoryBranch(req, req.query.branch);
    if (!scope.all) {
      const keys = scope.keys;
      const id = String(scope.branchDoc._id);
      const fromMatches = keys.includes(String(transfer.fromBranch)) ||
        String(transfer.fromBranchRef || '') === id;
      const toMatches = keys.includes(String(transfer.toBranch)) ||
        String(transfer.toBranchRef || '') === id;

      if (!fromMatches && !toMatches) {
        return sendResponse(res, 404, false, null, 'Transfer not found');
      }
    }

    await transfer.populate('items.ingredient', 'name sku baseUnit unitCost');
    sendResponse(res, 200, true, transfer, 'Transfer retrieved successfully');
  } catch (err) {
    if (err.statusCode) {
      return sendResponse(res, err.statusCode, false, null, err.message);
    }
    next(err);
  }
};

const getWastage = async (req, res, next) => {
  try {
    const { branch, reason } = req.query;
    const query = {};
    if (reason && reason !== 'ALL') query.reason = reason;

    const scope = await resolveInventoryBranch(req, branch);
    if (!scope.all) {
      query.$or = [
        { branch: { $in: scope.keys } },
        { branchRef: scope.branchDoc._id }
      ];
    }

    const list = await Wastage.find(query)
      .populate('ingredient', 'name sku baseUnit')
      .sort({ date: -1 });

    sendResponse(res, 200, true, list, 'Wastage logs retrieved');
  } catch (err) {
    if (err.statusCode) {
      return sendResponse(res, err.statusCode, false, null, err.message);
    }
    next(err);
  }
};

const recordWastage = async (req, res, next) => {
  let session;

  try {
    const {
      branch,
      ingredient: ingId,
      quantity,
      reason,
      notes,
      batchNumber
    } = req.body;

    const qty = Number(quantity);
    const allowedReasons = [
      'EXPIRED',
      'SPOILED',
      'PREP_LOSS',
      'HANDLING_DAMAGE'
    ];

    if (!branch || !ingId) {
      return sendResponse(res, 400, false, null, 'Branch and ingredient are required');
    }

    if (!Number.isFinite(qty) || qty <= 0) {
      return sendResponse(res, 400, false, null, 'Quantity must be a positive finite number');
    }

    if (!allowedReasons.includes(reason)) {
      return sendResponse(res, 400, false, null, 'Invalid wastage reason');
    }

    const scope = await resolveInventoryBranch(req, branch);
    if (scope.all || !scope.branchDoc) {
      return sendResponse(res, 400, false, null, 'A specific active branch is required');
    }

    const branchId = String(scope.branchDoc._id);
    const branchCode = String(scope.branchDoc.code);
    const ingredientExists = await Ingredient.exists({ _id: ingId });

    if (!ingredientExists) {
      return sendResponse(res, 404, false, null, 'Ingredient not found');
    }

    const wasteNumber = String(
      req.body.wasteNumber ||
      `WST-${new Date().getFullYear()}-${Date.now()}-${new mongoose.Types.ObjectId().toString().slice(-6)}`
    ).toUpperCase();

    const userId = req.user?._id;
    const userLogged = userId ? String(userId) : 'Staff';
    let result;

    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const ing = await Ingredient.findById(ingId).session(session);

      if (!ing) {
        const error = new Error('Ingredient not found');
        error.statusCode = 404;
        throw error;
      }

      const stockMap = ing.stockByBranch;
      const hasIdKey = stockMap.has(branchId);
      const hasCodeKey = stockMap.has(branchCode);

      if (branchId !== branchCode && hasIdKey && hasCodeKey) {
        const error = new Error(
          'Stock exists under both branch ID and branch code. Reconcile the balances before recording wastage.'
        );
        error.statusCode = 409;
        throw error;
      }

      const stockKey = hasIdKey
        ? branchId
        : hasCodeKey
          ? branchCode
          : branchId;

      const currentStock = Number(stockMap.get(stockKey) || 0);

      if (!Number.isFinite(currentStock) || currentStock < 0) {
        const error = new Error('The branch stock balance is invalid');
        error.statusCode = 409;
        throw error;
      }

      if (currentStock < qty) {
        const error = new Error(
          `Cannot discard ${qty} ${ing.baseUnit}. Only ${currentStock} in stock.`
        );
        error.statusCode = 400;
        throw error;
      }

      const deducted = depleteBatchesFIFO(
        ing.batches,
        stockKey,
        qty,
        batchNumber || null
      );

      if (Math.abs(deducted - qty) > 1e-8) {
        const error = new Error('Batch deduction did not match the requested quantity');
        error.statusCode = 409;
        throw error;
      }

      const newStock = Number((currentStock - qty).toFixed(8));
      stockMap.set(stockKey, newStock);

      await ing.save({ session });

      const unitCost = Number(ing.unitCost);
      const totalCost = Math.round(unitCost * qty * 100) / 100;

      const [wastage] = await Wastage.create([{
        wasteNumber,
        branch: stockKey,
        branchRef: scope.branchDoc._id,
        ingredient: ing._id,
        batchNumber: batchNumber || 'GENERAL-STOCK',
        quantity: qty,
        unit: ing.baseUnit,
        unitCost,
        totalCost,
        reason,
        loggedBy: userLogged,
        loggedByUser: userId || undefined,
        notes
      }], { session });

      const [movement] = await StockMovement.create([{
        type: 'WASTAGE_DEDUCTION',
        reference: wasteNumber,
        ingredient: ing._id,
        branch: stockKey,
        branchRef: scope.branchDoc._id,
        deltaQty: -qty,
        unit: ing.baseUnit,
        resultingBalance: newStock,
        performedBy: userLogged,
        performedByUser: userId || undefined,
        notes: `Reason: ${reason}. Total loss: ${totalCost}`
      }], { session });

      result = { wastage, movement };
    });

    return sendResponse(
      res,
      201,
      true,
      result.wastage,
      'Wastage logged and stock deducted'
    );
  } catch (err) {
    if (err.statusCode) {
      return sendResponse(res, err.statusCode, false, null, err.message);
    }

    if (err.code === 11000) {
      return sendResponse(res, 409, false, null, 'Wastage reference already exists');
    }

    next(err);
  } finally {
    if (session) await session.endSession();
  }
};

// ==========================================
// 5. AUDIT MOVEMENTS
// ==========================================

const getMovements = async (req, res, next) => {
  try {
    const { branch, type } = req.query;
    const query = {};
    if (type && type !== 'ALL') query.type = type;

    const scope = await resolveInventoryBranch(req, branch);
    if (!scope.all) {
      query.$or = [
        { branch: { $in: scope.keys } },
        { branchRef: scope.branchDoc._id }
      ];
    }

    const movements = await StockMovement.find(query)
      .populate('ingredient', 'name sku baseUnit')
      .sort({ timestamp: -1 })
      .limit(100);

    sendResponse(res, 200, true, movements, 'Movement audit logs retrieved');
  } catch (err) {
    if (err.statusCode) {
      return sendResponse(res, err.statusCode, false, null, err.message);
    }
    next(err);
  }
};

// ==========================================
// 6. ANALYTICS & REPORTS
// ==========================================

const getDashboardKPIs = async (req, res, next) => {
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
};

const getValuation = async (req, res, next) => {
  try {
    const { branch = 'all', method = 'FIFO' } = req.query;
    const ingredients = await Ingredient.find().sort({ name: 1 });

    let totalPortfolioValue = 0;
    const items = [];

    for (const ing of ingredients) {
      let branchStock = 0;
      if (branch === 'all') {
        for (const [_, qty] of ing.stockByBranch.entries()) {
          branchStock += Number(qty || 0);
        }
      } else {
        branchStock = Number(ing.stockByBranch.get(branch) || 0);
      }

      let activeBatches = ing.batches.filter(b => b.quantity > 0);
      if (branch !== 'all') {
        activeBatches = activeBatches.filter(b => b.branch === branch);
      }

      let calculatedValue = 0;

      if (activeBatches.length > 0) {
        if (method === 'FIFO') {
          const sorted = [...activeBatches].sort((a, b) => new Date(a.createdAt || a.expiryDate) - new Date(b.createdAt || b.expiryDate));
          let remainingQty = branchStock;
          for (const b of sorted) {
            const take = Math.min(b.quantity, remainingQty);
            calculatedValue += take * (b.receivedCost || ing.unitCost);
            remainingQty -= take;
            if (remainingQty <= 0) break;
          }
          if (remainingQty > 0) {
            calculatedValue += remainingQty * ing.unitCost;
          }
        } else {
          const totalBatchCost = activeBatches.reduce((acc, b) => acc + (b.quantity * (b.receivedCost || ing.unitCost)), 0);
          const totalBatchQty = activeBatches.reduce((acc, b) => acc + b.quantity, 0);
          const avgUnitCost = totalBatchQty > 0 ? (totalBatchCost / totalBatchQty) : ing.unitCost;
          calculatedValue = branchStock * avgUnitCost;
        }
      } else {
        calculatedValue = branchStock * ing.unitCost;
      }

      totalPortfolioValue += calculatedValue;
      items.push({
        id: ing._id,
        sku: ing.sku,
        name: ing.name,
        category: ing.category,
        unit: ing.baseUnit,
        baseUnit: ing.baseUnit,
        quantity: branchStock,
        unitCost: branchStock > 0 ? Math.round((calculatedValue / branchStock) * 100) / 100 : ing.unitCost,
        valuation: Math.round(calculatedValue * 100) / 100,
        totalValue: Math.round(calculatedValue * 100) / 100,
        valuationMethod: method
      });
    }

    sendResponse(res, 200, true, {
      method,
      branch,
      branchId: branch,
      branchName: branch === 'all' ? 'All Enterprise Branches' : branch,
      generatedAt: new Date().toISOString(),
      totalPortfolioValue: Math.round(totalPortfolioValue * 100) / 100,
      items
    }, `Inventory valuation using ${method}`);
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 7. KITCHEN CONSUMPTION & CROSS-MODULE INTEGRATION HANDSHAKES
// ==========================================

const getStockStatus = async (req, res, next) => {
  try {
    const { branch = 'all' } = req.query;
    const ingredients = await Ingredient.find().sort({ name: 1 });

    const outOfStock = [];
    const criticallyLow = [];
    const lowStock = [];

    for (const ing of ingredients) {
      let stock = 0;
      if (branch === 'all') {
        for (const [_, qty] of ing.stockByBranch.entries()) {
          stock += Number(qty || 0);
        }
      } else {
        stock = Number(ing.stockByBranch.get(branch) || 0);
      }

      const itemInfo = {
        ingredientId: ing._id,
        sku: ing.sku,
        name: ing.name,
        category: ing.category,
        baseUnit: ing.baseUnit,
        currentStock: stock,
        minThreshold: ing.minThreshold,
        reorderLevel: ing.reorderLevel
      };

      if (stock <= 0) {
        outOfStock.push({ ...itemInfo, status: 'OUT_OF_STOCK' });
      } else if (stock <= ing.minThreshold * 0.5) {
        criticallyLow.push({ ...itemInfo, status: 'CRITICALLY_LOW' });
      } else if (stock <= ing.minThreshold) {
        lowStock.push({ ...itemInfo, status: 'LOW_STOCK' });
      }
    }

    sendResponse(res, 200, true, {
      branch,
      timestamp: new Date().toISOString(),
      counts: {
        outOfStock: outOfStock.length,
        criticallyLow: criticallyLow.length,
        lowStock: lowStock.length,
        totalAlerts: outOfStock.length + criticallyLow.length + lowStock.length
      },
      outOfStock,
      criticallyLow,
      lowStock
    }, 'Branch stock status and 86-list retrieved');
  } catch (err) {
    next(err);
  }
};

const checkRecipeAvailability = async (req, res, next) => {
  try {
    const { branch, items } = req.body;
    if (!branch || !items || !Array.isArray(items)) {
      return sendResponse(res, 400, false, null, 'Branch and valid items array are required');
    }

    let allAvailable = true;
    const checkedItems = [];

    for (const item of items) {
      const ingId = item.ingredientId || item.ingredient;
      const ing = await Ingredient.findById(ingId);
      if (!ing) {
        allAvailable = false;
        checkedItems.push({
          ingredientId: ingId,
          found: false,
          error: 'Ingredient not found in master catalog'
        });
        continue;
      }

      const rawQty = Number(item.quantity !== undefined ? item.quantity : item.qty);
      let requiredInBase = rawQty;
      const requestedUnit = item.unit || ing.baseUnit;

      if (requestedUnit !== ing.baseUnit) {
        try {
          requiredInBase = UnitConversion.convert(rawQty, requestedUnit, ing.baseUnit);
        } catch (unitErr) {
          allAvailable = false;
          checkedItems.push({
            ingredientId: ing._id,
            name: ing.name,
            error: unitErr.message
          });
          continue;
        }
      }

      const available = ing.stockByBranch.get(branch) || 0;
      const isSufficient = available >= requiredInBase;
      if (!isSufficient) allAvailable = false;

      checkedItems.push({
        ingredientId: ing._id,
        sku: ing.sku,
        name: ing.name,
        requestedQty: rawQty,
        requestedUnit,
        requiredInBaseUnit: requiredInBase,
        baseUnit: ing.baseUnit,
        availableStock: available,
        isSufficient,
        deficit: isSufficient ? 0 : UnitConversion.roundQuantity(requiredInBase - available)
      });
    }

    sendResponse(res, 200, true, {
      branch,
      allAvailable,
      items: checkedItems
    }, allAvailable ? 'All ingredients available for order' : 'Insufficient ingredients for order');
  } catch (err) {
    next(err);
  }
};

const consumeRecipe = async (req, res, next) => {
  let session;
  try {
    const { branch, orderId, orderNumber, items } = req.body;
    if (!branch || !Array.isArray(items) || items.length === 0) {
      return sendResponse(res, 400, false, null,
        'Branch and a non-empty items array are required');
    }

    const requests = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const ingredientId = item?.ingredientId || item?.ingredient;
      const rawQty = Number(item?.quantity !== undefined ? item.quantity : item?.qty);

      if (!ingredientId || !mongoose.isValidObjectId(ingredientId)) {
        return sendResponse(res, 400, false, null,
          `Missing or invalid ingredient ID at index ${i}`);
      }
      if (!Number.isFinite(rawQty) || rawQty <= 0) {
        return sendResponse(res, 400, false, null,
          `Invalid positive quantity at index ${i}`);
      }
      requests.push({
        index: i,
        ingredientId: String(ingredientId),
        rawQty,
        requestedUnit: item.unit,
        batchNumber: item.batchNumber || null
      });
    }

    const scope = await resolveInventoryBranch(req, branch);
    if (scope.all || !scope.branchDoc) {
      return sendResponse(res, 400, false, null,
        'A specific active branch is required');
    }

    const branchId = String(scope.branchDoc._id);
    const branchCode = String(scope.branchDoc.code);
    const orderRef = String(orderNumber || orderId || `POS-${Date.now()}`);
    const performedBy = String(req.user?._id || req.user?.id || 'Kitchen Station');
    const performedByUser = req.user?._id;
    let deducted = [];
    let lowStockAlerts = [];

    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      deducted = [];
      lowStockAlerts = [];

      for (const request of requests) {
        const ing = await Ingredient.findById(request.ingredientId).session(session);
        if (!ing) {
          const error = new Error(`Ingredient not found: ${request.ingredientId}`);
          error.statusCode = 400;
          throw error;
        }

        const requestedUnit = request.requestedUnit || ing.baseUnit;
        let consumeQty = request.rawQty;
        if (requestedUnit !== ing.baseUnit) {
          try {
            consumeQty = UnitConversion.convert(request.rawQty, requestedUnit, ing.baseUnit);
          } catch (unitError) {
            const error = new Error(`Unit conversion failed for ${ing.name}: ${unitError.message}`);
            error.statusCode = 400;
            throw error;
          }
        }
        if (!Number.isFinite(consumeQty) || consumeQty <= 0) {
          const error = new Error(`Invalid converted quantity for ${ing.name}`);
          error.statusCode = 400;
          throw error;
        }

        const stockMap = ing.stockByBranch;
        const hasIdKey = stockMap.has(branchId);
        const hasCodeKey = stockMap.has(branchCode);
        if (branchId !== branchCode && hasIdKey && hasCodeKey) {
          const error = new Error(
            `Stock for ${ing.name} exists under both branch ID and branch code. Reconcile before consumption.`
          );
          error.statusCode = 409;
          throw error;
        }

        const stockKey = hasIdKey ? branchId : hasCodeKey ? branchCode : branchId;
        const currentStock = Number(stockMap.get(stockKey) || 0);
        if (!Number.isFinite(currentStock) || currentStock < 0) {
          const error = new Error(`Invalid stock balance for ${ing.name}`);
          error.statusCode = 409;
          throw error;
        }
        if (currentStock < consumeQty) {
          const error = new Error(
            `Insufficient stock for ${ing.name}. Available: ${currentStock} ${ing.baseUnit}; required: ${consumeQty} ${ing.baseUnit}.`
          );
          error.statusCode = 400;
          throw error;
        }

        try {
          const batchDeducted = depleteBatchesFIFO(
            ing.batches, stockKey, consumeQty, request.batchNumber
          );
          if (Math.abs(batchDeducted - consumeQty) > 1e-8) {
            throw new Error('Batch deduction did not match requested quantity');
          }
        } catch (batchError) {
          const error = new Error(`Batch depletion failed for ${ing.name}: ${batchError.message}`);
          error.statusCode = 409;
          throw error;
        }

        const newBalance = UnitConversion.roundQuantity(currentStock - consumeQty);
        stockMap.set(stockKey, newBalance);
        await ing.save({ session });

        const [movement] = await StockMovement.create([{
          type: 'RECIPE_CONSUMPTION',
          reference: `ORD-${orderRef}`,
          ingredient: ing._id,
          branch: stockKey,
          branchRef: scope.branchDoc._id,
          deltaQty: -consumeQty,
          unit: ing.baseUnit,
          resultingBalance: newBalance,
          performedBy,
          performedByUser,
          notes: `Recipe consumption for order ${orderRef}. Consumed ${request.rawQty} ${requestedUnit} (${consumeQty} ${ing.baseUnit})`
        }], { session });

        const isOutOfStock = newBalance <= 0;
        const isLowStock = newBalance <= Number(ing.minThreshold || 0);
        if (isLowStock) {
          lowStockAlerts.push({
            ingredientId: ing._id,
            sku: ing.sku,
            name: ing.name,
            currentBalance: newBalance,
            minThreshold: ing.minThreshold,
            unit: ing.baseUnit,
            isOutOfStock
          });
        }
        deducted.push({
          ingredientId: ing._id,
          sku: ing.sku,
          name: ing.name,
          consumedQty: consumeQty,
          baseUnit: ing.baseUnit,
          remainingBalance: newBalance,
          movementId: movement._id,
          isLowStock,
          isOutOfStock
        });
      }
    });

    return sendResponse(res, 200, true, {
      orderRef, branch, totalItemsDeducted: deducted.length, deducted, lowStockAlerts
    }, 'Recipe ingredients successfully deducted from branch inventory');
  } catch (err) {
    if (err.statusCode) {
      return sendResponse(res, err.statusCode, false, null, err.message);
    }
    return next(err);
  } finally {
    if (session) await session.endSession();
  }
};

module.exports = {
  // Internal / Helper Utilities
  resolveInventoryBranch,
  getScopedBranchStock,
  inventoryRecordMatchesBranch,
  applyBranchStringFilter,

  // Ingredients & Stock
  getIngredients,
  createIngredient,
  adjustStock,
  getExpiringBatches,
  getIngredientById,
  updateIngredient,
  deleteIngredient,

  // Suppliers
  getSuppliers,
  createSupplier,
  updateSupplierStatus,
  getSupplierById,
  updateSupplier,

  // Purchase Orders
  getPurchaseOrders,
  createPurchaseOrder,
  approvePurchaseOrder,
  updatePurchaseOrderStatus,
  receivePurchaseOrder,
  getPurchaseOrderById,
  deletePurchaseOrder,

  // Transfers & Wastage
  getTransfers,
  dispatchTransfer,
  receiveTransfer,
  getTransferById,
  getWastage,
  recordWastage,

  // Movements
  getMovements,

  // Analytics
  getDashboardKPIs,
  getValuation,

  // Cross-Module Integration
  getStockStatus,
  checkRecipeAvailability,
  consumeRecipe
};
