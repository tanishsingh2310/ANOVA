export default function BatchTrackerModal({ isOpen, onClose, ingredient, branches = [] }) {
  if (!isOpen || !ingredient) return null;

  const branchMap = {};
  branches.forEach(b => { branchMap[b.id] = b.name; });

  const batches = ingredient.batches || [];
  const today = new Date();

  return (
    <div className="inv-modal-overlay">
      <div className="inv-modal-content" style={{ maxWidth: '750px' }}>
        <div className="inv-modal-header">
          <div>
            <h3>Batch & Expiry Ledger</h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {ingredient.name} • SKU: <code style={{ fontSize: '11px' }}>{ingredient.sku}</code> • Base Unit: {ingredient.baseUnit}
            </p>
          </div>
          <button type="button" className="inv-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="inv-modal-body">
          {batches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
              No active batches registered for this ingredient.
            </div>
          ) : (
            <div className="inv-table-wrapper">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th style={{ width: '130px', whiteSpace: 'nowrap' }}>Batch #</th>
                    <th>Branch Location</th>
                    <th>Batch Qty</th>
                    <th style={{ width: '110px', whiteSpace: 'nowrap' }}>Expiry Date</th>
                    <th>Status</th>
                    <th>Received Cost</th>
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
                        <td className="inv-cell-code"><code>{b.batchNumber}</code></td>
                        <td className="inv-cell-nowrap">{branchMap[b.branchId] || b.branchId}</td>
                        <td className="inv-cell-nowrap"><strong>{b.qty} {ingredient.baseUnit}</strong></td>
                        <td className="inv-cell-date">{b.expiryDate}</td>
                        <td className="inv-cell-badge">
                          {isExpired ? (
                            <span className="inv-badge inv-badge-danger">Expired ({Math.abs(diffDays)}d ago)</span>
                          ) : isSoon ? (
                            <span className="inv-badge inv-badge-warning">Expires in {diffDays}d</span>
                          ) : (
                            <span className="inv-badge inv-badge-success">Good ({diffDays}d)</span>
                          )}
                        </td>
                        <td className="inv-cell-amount">₹{b.receivedCost}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="inv-modal-footer">
          <button type="button" className="inv-btn inv-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
