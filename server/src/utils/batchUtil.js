/**
 * Inventory batch ledger utilities.
 * Depletes stock by earliest expiry date first.
 */

function depleteBatchesFIFO(
  batches,
  branch,
  qtyToDeduct,
  specificBatchNumber = null
) {
  if (!Array.isArray(batches)) {
    throw new Error("A valid batch ledger is required");
  }

  const requested = Number(qtyToDeduct);

  if (!Number.isFinite(requested) || requested < 0) {
    throw new Error("Batch deduction quantity must be finite and non-negative");
  }

  if (requested === 0) return 0;

  const branchKeys = new Set(
    (Array.isArray(branch) ? branch : [branch])
      .filter(value => value != null)
      .map(value => String(value._id || value))
  );

  if (branchKeys.size === 0) {
    throw new Error("A valid branch identifier is required");
  }

  function matchesBranch(batch) {
    // The stored branch key is authoritative when present.
    // branchRef is metadata and must not override a different branch key.
    const value = batch.branch != null
      ? batch.branch
      : batch.branchId != null
        ? batch.branchId
        : batch.branchRef;

    if (value == null) return false;
    return branchKeys.has(String(value._id || value));
  }

  function quantityOf(batch) {
    const raw = batch.quantity !== undefined ? batch.quantity : batch.qty;
    const quantity = Number(raw);
    return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  }

  const eligible = batches.filter(
    batch => matchesBranch(batch) && quantityOf(batch) > 0
  );

  // Plan deductions first; don't mutate the ledger unless stock is sufficient.
  const planned = new Map();
  let remaining = requested;

  function planFrom(batch) {
    const available = Math.max(
      0,
      quantityOf(batch) - (planned.get(batch) || 0)
    );
    const take = Math.min(available, remaining);

    if (take > 0) {
      planned.set(batch, (planned.get(batch) || 0) + take);
      remaining -= take;
    }
  }

  let selectedBatch = null;

  if (specificBatchNumber && specificBatchNumber !== "GENERAL-STOCK") {
    selectedBatch = eligible.find(
      batch => String(batch.batchNumber) === String(specificBatchNumber)
    );

    if (selectedBatch) planFrom(selectedBatch);
  }

  if (remaining > 1e-8) {
    const fifoBatches = eligible
      .filter(batch => batch !== selectedBatch)
      .sort((a, b) => {
        const dateA = new Date(a.expiryDate || a.createdAt || 0).getTime();
        const dateB = new Date(b.expiryDate || b.createdAt || 0).getTime();

        if (!Number.isFinite(dateA) && !Number.isFinite(dateB)) return 0;
        if (!Number.isFinite(dateA)) return 1;
        if (!Number.isFinite(dateB)) return -1;
        return dateA - dateB;
      });

    for (const batch of fifoBatches) {
      if (remaining <= 1e-8) break;
      planFrom(batch);
    }
  }

  // Use the selected batch's remaining quantity before moving to other batches.
  if (remaining > 1e-8 && selectedBatch) {
    planFrom(selectedBatch);
  }

  if (remaining > 1e-8) {
    const available = requested - remaining;
    throw new Error(
      `Insufficient batch quantity: requested ${requested}, available ${available}`
    );
  }

  for (const [batch, take] of planned) {
    const nextQuantity = Math.max(0, quantityOf(batch) - take);

    if (batch.quantity !== undefined) batch.quantity = nextQuantity;
    if (batch.qty !== undefined) batch.qty = nextQuantity;
  }

  return requested;
}

function adjustBatches(
  batches,
  branch,
  deltaQty,
  unitCost = 0,
  reason = "COUNT_ADJUSTMENT"
) {
  if (!Array.isArray(batches)) {
    throw new Error("A valid batch ledger is required");
  }

  const delta = Number(deltaQty);

  if (!Number.isFinite(delta)) {
    throw new Error("Adjustment quantity must be finite");
  }

  if (delta === 0) return;

  if (delta < 0) {
    depleteBatchesFIFO(batches, branch, Math.abs(delta));
    return;
  }

  const cost = Number(unitCost);

  if (!Number.isFinite(cost) || cost < 0) {
    throw new Error("Unit cost must be finite and non-negative");
  }

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 90);

  batches.push({
    batchNumber: `ADJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    branch: String(branch),
    quantity: delta,
    expiryDate,
    receivedCost: cost,
    adjustmentReason: String(reason || "COUNT_ADJUSTMENT")
  });
}

module.exports = {
  depleteBatchesFIFO,
  adjustBatches
};