/**
 * ANOVA BATCH LEDGER & FIFO DEPLETION UTILITY
 * Ensures physical inventory deductions (recipe consumption, transfers, wastage, adjustments)
 * deplete batches chronologically (First-In, First-Out) so inventory valuation remains 100% accurate.
 */

/**
 * Depletes a specified quantity from ingredient batches using FIFO.
 * If specificBatchNumber is provided and exists, it is depleted first.
 *
 * @param {Array} batches - Array of batch documents or subdocuments
 * @param {string} branch - Branch ID or code
 * @param {number} qtyToDeduct - Quantity to deduct (positive number)
 * @param {string} [specificBatchNumber] - Optional specific batch number
 * @returns {number} actualDeducted - Total amount deducted
 */
function depleteBatchesFIFO(batches, branch, qtyToDeduct, specificBatchNumber = null) {
  if (!batches || !Array.isArray(batches) || qtyToDeduct <= 0) return 0;

  let remaining = Number(qtyToDeduct);

  // 1. If specific batch is requested, deduct from it first
  if (specificBatchNumber && specificBatchNumber !== 'GENERAL-STOCK') {
    const target = batches.find(
      b => (b.branch === branch || b.branchId === branch) && b.batchNumber === specificBatchNumber && (b.quantity > 0 || b.qty > 0)
    );
    if (target) {
      const avail = target.quantity !== undefined ? target.quantity : target.qty;
      const take = Math.min(avail, remaining);
      if (target.quantity !== undefined) target.quantity -= take;
      if (target.qty !== undefined) target.qty -= take;
      remaining -= take;
    }
  }

  if (remaining <= 0) return qtyToDeduct;

  // 2. FIFO depletion: sort batches for this branch by expiryDate / createdAt ascending
  const branchBatches = batches.filter(
    b => (b.branch === branch || b.branchId === branch) && ((b.quantity !== undefined ? b.quantity : b.qty) > 0)
  );

  branchBatches.sort((a, b) => {
    const dateA = new Date(a.expiryDate || a.createdAt || 0).getTime();
    const dateB = new Date(b.expiryDate || b.createdAt || 0).getTime();
    return dateA - dateB;
  });

  for (const batch of branchBatches) {
    if (remaining <= 0) break;
    const avail = batch.quantity !== undefined ? batch.quantity : batch.qty;
    const take = Math.min(avail, remaining);
    if (batch.quantity !== undefined) batch.quantity -= take;
    if (batch.qty !== undefined) batch.qty -= take;
    remaining -= take;
  }

  return qtyToDeduct - remaining;
}

/**
 * Synchronizes batch ledger when physical stock is adjusted.
 * If stock is reduced, depletes batches via FIFO.
 * If stock is increased (surplus), records an audit adjustment batch.
 *
 * @param {Array} batches - Array of batch documents
 * @param {string} branch - Branch ID
 * @param {number} deltaQty - Change in quantity (positive for surplus, negative for deficit)
 * @param {number} unitCost - Cost per unit
 * @param {string} [reason] - Adjustment reason
 */
function adjustBatches(batches, branch, deltaQty, unitCost = 0, reason = 'COUNT_ADJUSTMENT') {
  if (!batches || deltaQty === 0) return;

  if (deltaQty < 0) {
    // Stock decreased: deplete oldest batches
    depleteBatchesFIFO(batches, branch, Math.abs(deltaQty));
  } else {
    // Stock increased: create adjustment batch for physical surplus
    const batchNumber = `ADJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 90); // Default 90 days if unknown

    batches.push({
      batchNumber,
      branch,
      branchId: branch,
      quantity: Number(deltaQty),
      qty: Number(deltaQty),
      expiryDate,
      receivedCost: Number(unitCost || 0)
    });
  }
}

module.exports = {
  depleteBatchesFIFO,
  adjustBatches
};
