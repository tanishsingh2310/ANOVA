import { useState } from 'react';
import { InventoryService } from '../services/inventoryService';

export default function StockAdjustmentModal({
  isOpen,
  onClose,
  ingredient,
  branchId,
  branches = [],
  onAdjusted
}) {
  const [selectedBranch, setSelectedBranch] = useState(branchId === 'all' ? (branches[0]?.id || 'b_downtown') : branchId);
  const [newCount, setNewCount] = useState('');
  const [reason, setReason] = useState('PHYSICAL_COUNT_VARIANCE');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !ingredient) return null;

  const currentQty = Number(ingredient.stockByBranch?.[selectedBranch] || 0);
  const enteredQty = newCount === '' ? currentQty : Number(newCount);
  const delta = enteredQty - currentQty;

  const handleBranchChange = (bId) => {
    setSelectedBranch(bId);
    setNewCount('');
    setError('');
  };

  const handleSubmit = (e) => {
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
      InventoryService.adjustStock({
        ingredientId: ingredient.id,
        branchId: selectedBranch,
        newQty: enteredQty,
        reason,
        notes,
        user: 'Arjun Verma (Director)'
      });

      onAdjusted();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to apply adjustment');
    }
  };

  return (
    <div className="inv-modal-overlay">
      <div className="inv-modal-content">
        <div className="inv-modal-header">
          <div>
            <h3>Adjust Physical Stock Count</h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {ingredient.name} ({ingredient.sku})
            </p>
          </div>
          <button type="button" className="inv-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="inv-modal-body">
            {error && <div className="inv-alert-banner inv-alert-danger">{error}</div>}

            <div className="inv-form-group">
              <label>Select Target Branch</label>
              <select
                className="inv-form-control"
                value={selectedBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
                ))}
              </select>
            </div>

            <div className="inv-form-row">
              <div className="inv-form-group">
                <label>Current System Stock</label>
                <input
                  type="text"
                  className="inv-form-control"
                  value={`${currentQty} ${ingredient.baseUnit}`}
                  disabled
                  style={{ background: 'var(--color-background)', fontWeight: 600 }}
                />
              </div>

              <div className="inv-form-group">
                <label>New Physical Count</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="inv-form-control"
                  placeholder="Enter counted quantity"
                  value={newCount}
                  onChange={(e) => setNewCount(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Delta calculation */}
            <div style={{
              background: delta < 0 ? 'var(--color-error-bg)' : delta > 0 ? 'var(--color-success-bg)' : '#F5F1E8',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
              fontWeight: 600
            }}>
              <span>Audit Variance (Delta):</span>
              <span style={{
                color: delta < 0 ? 'var(--color-error)' : delta > 0 ? 'var(--color-success)' : 'var(--color-text)'
              }}>
                {delta > 0 ? `+${delta}` : delta} {ingredient.baseUnit} ({delta < 0 ? 'Shortage' : delta > 0 ? 'Surplus' : 'Balanced'})
              </span>
            </div>

            <div className="inv-form-group">
              <label>Adjustment Reason Code *</label>
              <select
                className="inv-form-control"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              >
                <option value="PHYSICAL_COUNT_VARIANCE">Physical Count Audit Variance</option>
                <option value="UNRECORDED_USAGE">Unrecorded Kitchen Preparation Usage</option>
                <option value="HANDLING_DAMAGE">Handling Damage / Container Leak</option>
                <option value="RECEIVING_CORRECTION">Vendor Delivery Discrepancy Correction</option>
                <option value="QUALITY_WRITE_OFF">Quality Inspection Write-Off</option>
              </select>
            </div>

            <div className="inv-form-group">
              <label>Auditor Notes & Reference ID</label>
              <textarea
                className="inv-form-control"
                rows="3"
                placeholder="Provide reference details or stock sheet count sheet ID..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>
          </div>

          <div className="inv-modal-footer">
            <button type="button" className="inv-btn inv-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="inv-btn inv-btn-primary">
              Confirm & Post Audit Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
