import { X } from 'lucide-react';

export default function BatchTrackerModal({ isOpen, onClose, ingredient, branches = [] }) {
  if (!isOpen || !ingredient) return null;

  const branchMap = {};
  branches.forEach(b => { branchMap[b.id || b._id] = b.name; });

  const batches = ingredient.batches || [];
  const today = new Date();

  return (
    <div
      className="employees-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="employees-modal" role="dialog" aria-modal="true" style={{ maxWidth: '750px' }}>
        <div className="employees-modal-heading">
          <div>
            <p className="employees-eyebrow">BATCH TRACEABILITY</p>
            <h3>Batch Ledger: {ingredient.name}</h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#748078' }}>
              SKU: <code>{ingredient.sku}</code> • Base Unit: {ingredient.baseUnit}
            </p>
          </div>
          <button
            type="button"
            className="employees-modal-close"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {batches.length === 0 ? (
          <div className="employees-empty-state">
            <p>No active batches registered for this ingredient.</p>
          </div>
        ) : (
          <div className="employees-table-scroll">
            <table className="employees-table">
              <thead>
                <tr>
                  <th>Batch #</th>
                  <th>Branch Location</th>
                  <th>Batch Qty</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Cost per Unit</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const exp = new Date(b.expiryDate);
                  const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
                  const isExpired = diffDays <= 0;
                  const isSoon = diffDays > 0 && diffDays <= 7;

                  return (
                    <tr key={b.id || b.batchNumber}>
                      <td><code>{b.batchNumber}</code></td>
                      <td>{branchMap[b.branchId || b.branch] || b.branchId || b.branch}</td>
                      <td><strong>{b.qty !== undefined ? b.qty : b.quantity} {ingredient.baseUnit}</strong></td>
                      <td>{b.expiryDate}</td>
                      <td>
                        <span className={`employees-status ${isExpired ? 'is-danger' : isSoon ? 'is-warning' : 'is-active'}`}>
                          {isExpired ? 'Expired' : isSoon ? `Expiring in ${diffDays}d` : 'Fresh'}
                        </span>
                      </td>
                      <td>₹{b.receivedCost || ingredient.unitCost || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="employees-form-actions">
          <button
            type="button"
            className="employees-button employees-button-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
