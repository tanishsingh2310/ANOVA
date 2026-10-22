import { useState, useEffect } from 'react';
import { MovementService } from '../services/movementService';
import { InventoryService } from '../services/inventoryService';
import '../../../styles/inventory-wastage.css';

export default function WastagePage({ branchId, branches = [] }) {
  const [wastageList, setWastageList] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [reasonFilter, setReasonFilter] = useState('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetBranch, setTargetBranch] = useState(branchId === 'all' ? (branches[0]?.id || 'b_downtown') : branchId);
  const [selectedIngId, setSelectedIngId] = useState('');
  const [wasteQty, setWasteQty] = useState('');
  const [reason, setReason] = useState('EXPIRED');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const [isSyncing, setIsSyncing] = useState(false);

  const loadData = async () => {
    const list = MovementService.getWastage({
      branchId,
      reason: reasonFilter
    });
    setWastageList(list);
    setIngredients(InventoryService.getIngredients());

    setIsSyncing(true);
    try {
      await Promise.all([
        MovementService.syncWastageFromBackend(branchId),
        InventoryService.syncFromBackend(branchId)
      ]);
      const fresh = MovementService.getWastage({
        branchId,
        reason: reasonFilter
      });
      setWastageList(fresh);
      setIngredients(InventoryService.getIngredients());
    } catch (err) {
      console.warn('Wastage sync error:', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [branchId, reasonFilter]);

  const selectedIng = ingredients.find(i => i.id === selectedIngId);
  const availableStock = selectedIng ? Number(selectedIng.stockByBranch?.[targetBranch] || 0) : 0;
  const unitCost = Number(selectedIng?.unitCost || 0);
  const calculatedLoss = Math.round(unitCost * (Number(wasteQty) || 0) * 100) / 100;

  const handleRecordWaste = async (e) => {
    e.preventDefault();
    if (!selectedIngId || !wasteQty || Number(wasteQty) <= 0) {
      setError('Please select an ingredient and enter a valid quantity');
      return;
    }
    if (Number(wasteQty) > availableStock) {
      setError(`Cannot write off ${wasteQty} ${selectedIng.baseUnit}. Only ${availableStock} available in this branch.`);
      return;
    }

    try {
      await MovementService.logWastageRemote({
        branchId: targetBranch,
        ingredientId: selectedIngId,
        qty: Number(wasteQty),
        reason,
        notes,
        loggedBy: 'Arjun Verma (Chef Director)'
      });
      await InventoryService.syncFromBackend(branchId);

      setIsModalOpen(false);
      setSelectedIngId('');
      setWasteQty('');
      setNotes('');
      setError('');
      loadData();
    } catch (err) {
      setError(err.message || 'Error recording wastage');
    }
  };

  const branchMap = {};
  branches.forEach(b => { branchMap[b.id] = b.name; });

  const ingredientMap = {};
  ingredients.forEach(i => { ingredientMap[i.id] = i.name; });

  const totalLoss = wastageList.reduce((sum, w) => sum + (Number(w.totalCost) || 0), 0);

  return (
    <div className="inv-wastage-page">
      {/* Top metrics summary */}
      <div className="inv-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="inv-kpi-card danger">
          <div className="inv-kpi-header">
            <span className="inv-kpi-label">Total Spoilage & Loss Value</span>
            <span className="dashboard-summary-indicator revenue" style={{ background: 'var(--color-error)' }} aria-hidden="true" />
          </div>
          <div className="inv-kpi-value" style={{ color: 'var(--color-error)' }}>
            ₹{totalLoss.toLocaleString()}
          </div>
          <div className="inv-kpi-sub">{wastageList.length} incident logs recorded</div>
        </div>

        <div className="inv-kpi-card">
          <div className="inv-kpi-header">
            <span className="inv-kpi-label">Primary Loss Cause</span>
            <span className="dashboard-summary-indicator orders" aria-hidden="true" />
          </div>
          <div className="inv-kpi-value" style={{ fontSize: '20px', marginTop: '4px' }}>
            Expiration & Spoilage
          </div>
          <div className="inv-kpi-sub">Focus area: batch rotation & FIFO controls</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="inv-toolbar">
        <div className="inv-filter-group">
          <select
            className="inv-select"
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            aria-label="Filter wastage by reason"
          >
            <option value="ALL">All Loss Reasons</option>
            <option value="EXPIRED">Expired Stock</option>
            <option value="SPOILED">Spoiled / Temperature Fluctuation</option>
            <option value="PREP_LOSS">Kitchen Preparation Loss / Over-trim</option>
            <option value="HANDLING_DAMAGE">Handling Damage / Spillage</option>
          </select>
        </div>

        <button
          type="button"
          className="inv-btn inv-btn-danger"
          onClick={() => setIsModalOpen(true)}
        >
          + Record Wastage / Spoilage
        </button>
      </div>

      {/* Wastage Table */}
      <div className="inv-card">
        <div className="inv-card-header">
          <div>
            <h3>Wastage & Kitchen Spoilage Log</h3>
            <p>Every write-off creates an audited reduction in available stock</p>
          </div>
        </div>
        <div className="inv-card-body" style={{ padding: 0 }}>
          <div className="inv-table-wrapper">
            <table className="inv-table">
              <thead>
                <tr>
                  <th style={{ width: '130px', whiteSpace: 'nowrap' }}>Log #</th>
                  <th>Branch</th>
                  <th>Ingredient</th>
                  <th>Qty Discarded</th>
                  <th>Unit Cost</th>
                  <th>Financial Loss</th>
                  <th>Reason</th>
                  <th>Reported By</th>
                  <th style={{ width: '130px', whiteSpace: 'nowrap' }}>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {wastageList.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                      No wastage records found for this branch.
                    </td>
                  </tr>
                ) : (
                  wastageList.map(w => (
                    <tr key={w.id}>
                      <td className="inv-cell-code"><code>{w.wasteNumber}</code></td>
                      <td className="inv-cell-nowrap">{branchMap[w.branchId] || w.branchId}</td>
                      <td><strong>{ingredientMap[w.ingredientId] || w.ingredientId}</strong></td>
                      <td className="inv-cell-nowrap" style={{ color: 'var(--color-error)', fontWeight: 600 }}>
                        -{w.qty} {w.unit}
                      </td>
                      <td className="inv-cell-amount">₹{w.unitCost}</td>
                      <td className="inv-cell-amount"><strong style={{ color: 'var(--color-error)' }}>₹{w.totalCost.toLocaleString()}</strong></td>
                      <td>
                        <span className="inv-badge inv-badge-danger">{w.reason.replace(/_/g, ' ')}</span>
                        {w.notes && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '2px' }}>"{w.notes}"</div>}
                      </td>
                      <td className="inv-cell-nowrap">{w.loggedBy}</td>
                      <td className="inv-cell-date">{w.date.replace('T', ' ').slice(0, 16)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RECORD WASTAGE MODAL */}
      {isModalOpen && (
        <div className="inv-modal-overlay">
          <div className="inv-modal-content">
            <div className="inv-modal-header">
              <h3>Record Inventory Wastage / Spoilage</h3>
              <button type="button" className="inv-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleRecordWaste}>
              <div className="inv-modal-body">
                {error && <div className="inv-alert-banner inv-alert-danger">{error}</div>}

                <div className="inv-form-row">
                  <div className="inv-form-group">
                    <label>Branch Location *</label>
                    <select
                      className="inv-form-control"
                      value={targetBranch}
                      onChange={(e) => setTargetBranch(e.target.value)}
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="inv-form-group">
                    <label>Select Ingredient *</label>
                    <select
                      className="inv-form-control"
                      value={selectedIngId}
                      onChange={(e) => setSelectedIngId(e.target.value)}
                      required
                    >
                      <option value="">Select Ingredient...</option>
                      {ingredients.map(ing => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({ing.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedIng && (
                  <div style={{
                    background: 'var(--color-background)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '14px',
                    fontSize: '12.5px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>Available Stock: <strong>{availableStock} {selectedIng.baseUnit}</strong></span>
                    <span>Standard Cost: <strong>₹{selectedIng.unitCost} / {selectedIng.baseUnit}</strong></span>
                  </div>
                )}

                <div className="inv-form-row">
                  <div className="inv-form-group">
                    <label>Quantity to Discard *</label>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      className="inv-form-control"
                      placeholder="e.g. 2.5"
                      value={wasteQty}
                      onChange={(e) => setWasteQty(e.target.value)}
                      required
                    />
                  </div>

                  <div className="inv-form-group">
                    <label>Calculated Monetary Impact</label>
                    <input
                      type="text"
                      className="inv-form-control"
                      value={`₹${calculatedLoss.toLocaleString()}`}
                      disabled
                      style={{ fontWeight: 700, color: 'var(--color-error)', background: 'var(--color-error-bg)' }}
                    />
                  </div>
                </div>

                <div className="inv-form-group">
                  <label>Wastage Reason Code *</label>
                  <select
                    className="inv-form-control"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  >
                    <option value="EXPIRED">Expired Past Best-Before / Use-By Date</option>
                    <option value="SPOILED">Spoiled Due to Heat or Cold-Chain Interruption</option>
                    <option value="PREP_LOSS">Excessive Preparation Trimming or Kitchen Burn</option>
                    <option value="HANDLING_DAMAGE">Dropped, Broken Container, or Contaminated</option>
                  </select>
                </div>

                <div className="inv-form-group">
                  <label>Auditor / Incident Notes</label>
                  <textarea
                    className="inv-form-control"
                    rows="2"
                    placeholder="Describe context (e.g., chiller door left ajar, recipe testing burn)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="inv-modal-footer">
                <button type="button" className="inv-btn inv-btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="inv-btn inv-btn-danger">
                  Confirm Spoilage Write-Off
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
