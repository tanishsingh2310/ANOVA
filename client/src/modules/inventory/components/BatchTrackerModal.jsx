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
              {ingredient.name} • SKU: {ingredient.sku} • Base Unit: {ingredient.baseUnit}
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
                    <th>Batch #</th>
                    <th>Branch Location</th>
                    <th>Batch Qty</th>
                    <th>Expiry Date</th>
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
                        <td><strong>{b.batchNumber}</strong></td>
                        <td>{branchMap[b.branchId] || b.branchId}</td>
                        <td>{b.qty} {ingredient.baseUnit}</td>
                        <td>{b.expiryDate}</td>
                        <td>
                          {isExpired ? (
                            <span className="inv-badge inv-badge-danger">Expired ({Math.abs(diffDays)}d ago)</span>
                          ) : isSoon ? (
                            <span className="inv-badge inv-badge-warning">Expires in {diffDays}d</span>
                          ) : (
                            <span className="inv-badge inv-badge-success">Good ({diffDays}d)</span>
                          )}
                        </td>
                        <td>₹{b.receivedCost}</td>
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
