import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { InventoryService } from '../services/inventoryService';

export default function StockAdjustmentModal({
  isOpen,
  onClose,
  ingredient,
  branchId,
  branches = [],
  onAdjusted
}) {
  const [selectedBranch, setSelectedBranch] = useState(branchId === 'all' ? (branches[0]?.id || branches[0]?._id || '') : branchId);
  const [newCount, setNewCount] = useState('');
  const [reason, setReason] = useState('PHYSICAL_COUNT_VARIANCE');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !ingredient) return null;

  const resolveCurrentQty = (ing, bId) => {
    if (!ing || !ing.stockByBranch) return 0;
    const b = branches.find(item => item.id === bId || item._id === bId || item.code === bId);
    const candidates = [bId, b?.code, b?.id, b?._id].filter(Boolean);
    for (const key of candidates) {
      if (ing.stockByBranch[key] !== undefined) {
        return Number(ing.stockByBranch[key]);
      }
    }
    return 0;
  };

  const currentQty = resolveCurrentQty(ingredient, selectedBranch);
  const enteredQty = newCount === '' ? currentQty : Number(newCount);
  const delta = enteredQty - currentQty;

  const handleBranchChange = (bId) => {
    setSelectedBranch(bId);
    setNewCount('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newCount === '') {
      setError('Please enter the newly counted stock quantity');
      return;
    }
    if (enteredQty < 0) {
      setError('Stock count cannot be negative');
      return;
    }
    if (delta === 0) {
      setError('The entered count matches the current balance. No adjustment required.');
      return;
    }

    try {
      await InventoryService.adjustStockRemote({
        ingredientId: ingredient.id,
        branchId: selectedBranch,
        newQty: enteredQty,
        reason,
        notes,
        user: 'Store Manager'
      });

      onAdjusted();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to apply adjustment');
    }
  };

  return (
    <div
      className="employees-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="employees-modal" role="dialog" aria-modal="true">
        <div className="employees-modal-heading">
          <div>
            <p className="employees-eyebrow">PHYSICAL AUDIT</p>
            <h3>Adjust Stock: {ingredient.name}</h3>
          </div>
          <button
            type="button"
            className="employees-modal-close"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="employees-error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="employees-form-grid">
            <label className="employees-field-full">
              Target Branch Location *
              <select
                value={selectedBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
              >
                {branches.map(b => (
                  <option key={b.id || b._id} value={b.id || b._id}>{b.name} ({b.city})</option>
                ))}
              </select>
            </label>

            <label>
              Current System Balance
              <input
                type="text"
                value={`${currentQty} ${ingredient.baseUnit}`}
                disabled
                style={{ background: '#f4f6f3', fontWeight: 600 }}
              />
            </label>

            <label>
              New Counted Physical Stock *
              <input
                type="number"
                step="any"
                min="0"
                placeholder="Enter physical count"
                value={newCount}
                onChange={(e) => setNewCount(e.target.value)}
                required
                autoFocus
              />
            </label>

            {/* Delta calculation */}
            <div className="employees-field-full" style={{
              background: delta < 0 ? '#fef2f2' : delta > 0 ? '#eff9f0' : '#f6f8f5',
              padding: '12px 16px',
              borderRadius: '9px',
              border: `1px solid ${delta < 0 ? '#fecaca' : delta > 0 ? '#cce8d2' : '#e3e9e3'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              fontWeight: 650
            }}>
              <span>Audit Variance (Delta):</span>
              <span style={{
                color: delta < 0 ? '#b91c1c' : delta > 0 ? '#287544' : '#26342f'
              }}>
                {delta > 0 ? `+${delta}` : delta} {ingredient.baseUnit} ({delta < 0 ? 'Shortage' : delta > 0 ? 'Surplus' : 'Balanced'})
              </span>
            </div>

            <label className="employees-field-full">
              Adjustment Reason Code *
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              >
                <option value="PHYSICAL_COUNT_VARIANCE">Physical Count Audit Variance</option>
                <option value="UNRECORDED_USAGE">Unrecorded Kitchen Preparation Usage</option>
                <option value="HANDLING_DAMAGE">Handling Damage / Spill</option>
                <option value="RECEIVING_CORRECTION">Vendor Delivery Discrepancy Correction</option>
                <option value="QUALITY_WRITE_OFF">Quality Inspection Write-Off</option>
              </select>
            </label>

            <label className="employees-field-full">
              Auditor Notes & Reference
              <textarea
                placeholder="Provide reference details or stock sheet count ID..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>

          <div className="employees-form-actions">
            <button
              type="button"
              className="employees-button employees-button-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="employees-button employees-button-primary"
            >
              Post Stock Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
