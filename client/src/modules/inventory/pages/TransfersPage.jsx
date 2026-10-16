import { useState, useEffect } from 'react';
import { MovementService } from '../services/movementService';
import { InventoryService } from '../services/inventoryService';
import StockBadge from '../components/StockBadge';

export default function TransfersPage({ branchId, branches = [] }) {
  const [transfers, setTransfers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // New Transfer Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fromBranch, setFromBranch] = useState(branches[0]?.id || 'b_downtown');
  const [toBranch, setToBranch] = useState(branches[1]?.id || 'b_uptown');
  const [transferLines, setTransferLines] = useState([{ ingredientId: '', qty: '' }]);
  const [transferNotes, setTransferNotes] = useState('');
  const [error, setError] = useState('');

  const loadData = () => {
    const list = MovementService.getTransfers({
      branchId,
      status: statusFilter
    });
    setTransfers(list);
    setIngredients(InventoryService.getIngredients());
  };

  useEffect(() => {
    loadData();
  }, [branchId, statusFilter]);

  const handleReceive = (transferId) => {
    try {
      MovementService.receiveTransfer({
        transferId,
        receivedBy: 'Arjun Verma (Director)'
      });
      loadData();
    } catch (err) {
      alert(err.message || 'Error receiving transfer');
    }
  };

  const handleLineChange = (index, field, value) => {
    const updated = [...transferLines];
    updated[index][field] = value;
    setTransferLines(updated);
  };

  const addLine = () => {
    setTransferLines([...transferLines, { ingredientId: '', qty: '' }]);
  };

  const removeLine = (idx) => {
    setTransferLines(transferLines.filter((_, i) => i !== idx));
  };

  const handleDispatch = (e) => {
    e.preventDefault();
    if (fromBranch === toBranch) {
      setError('Origin and destination branches must be different');
      return;
    }
    if (transferLines.some(l => !l.ingredientId || !l.qty || Number(l.qty) <= 0)) {
      setError('Please provide valid ingredients and transfer quantities');
      return;
    }

    try {
      MovementService.dispatchTransfer({
        fromBranchId: fromBranch,
        toBranchId: toBranch,
        items: transferLines.map(l => {
          const ing = ingredients.find(i => i.id === l.ingredientId);
          return {
            ingredientId: l.ingredientId,
            qty: Number(l.qty),
            unit: ing?.baseUnit || 'kg',
            unitCost: ing?.unitCost || 0
          };
        }),
        notes: transferNotes,
        dispatchedBy: 'Arjun Verma (Logistics Lead)'
      });

      setIsModalOpen(false);
      setTransferLines([{ ingredientId: '', qty: '' }]);
      setTransferNotes('');
      setError('');
      loadData();
    } catch (err) {
      setError(err.message || 'Transfer dispatch failed');
    }
  };

  const branchMap = {};
  branches.forEach(b => { branchMap[b.id] = b.name; });

  const ingredientMap = {};
  ingredients.forEach(i => { ingredientMap[i.id] = i.name; });

  return (
    <div className="inv-transfers-page">
      {/* Toolbar */}
      <div className="inv-toolbar">
        <div className="inv-filter-group">
          <select
            className="inv-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter transfers by status"
          >
            <option value="ALL">All Transfer Statuses</option>
            <option value="IN_TRANSIT">In-Transit Only</option>
            <option value="RECEIVED">Received & Stocked</option>
          </select>
        </div>

        <button
          type="button"
          className="inv-btn inv-btn-primary"
          onClick={() => setIsModalOpen(true)}
        >
          + Dispatch New Branch Transfer
        </button>
      </div>

      {/* Transfer List */}
      <div className="inv-card">
        <div className="inv-card-header">
          <div>
            <h3>Inter-Branch Stock Transfers</h3>
            <p>Prevents double counting: stock is deducted from source and placed In-Transit until confirmed</p>
          </div>
        </div>
        <div className="inv-card-body" style={{ padding: 0 }}>
          <div className="inv-table-wrapper">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Transfer #</th>
                  <th>Origin Branch</th>
                  <th>Destination Branch</th>
                  <th>Items Transferred</th>
                  <th>Dispatched Time</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                      No inter-branch transfers found for this filter.
                    </td>
                  </tr>
                ) : (
                  transfers.map(tr => (
                    <tr key={tr.id}>
                      <td><strong>{tr.transferNumber}</strong></td>
                      <td>{branchMap[tr.fromBranchId] || tr.fromBranchId}</td>
                      <td>{branchMap[tr.toBranchId] || tr.toBranchId}</td>
                      <td>
                        {tr.items.map((it, idx) => (
                          <div key={idx} style={{ fontSize: '12px' }}>
                            • <strong>{ingredientMap[it.ingredientId] || it.ingredientId}</strong>: {it.qty} {it.unit}
                          </div>
                        ))}
                      </td>
                      <td>
                        <div>{tr.dispatchedAt ? tr.dispatchedAt.replace('T', ' ').slice(0, 16) : '-'}</div>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>by {tr.dispatchedBy}</span>
                      </td>
                      <td><StockBadge status={tr.status} /></td>
                      <td style={{ textAlign: 'right' }}>
                        {tr.status === 'IN_TRANSIT' ? (
                          <button
                            type="button"
                            className="inv-btn inv-btn-sm inv-btn-gold"
                            onClick={() => handleReceive(tr.id)}
                            title="Confirm receipt at destination branch"
                          >
                            ✓ Receive Stock
                          </button>
                        ) : (
                          <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                            Received on {tr.receivedAt ? tr.receivedAt.split('T')[0] : 'Done'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DISPATCH TRANSFER MODAL */}
      {isModalOpen && (
        <div className="inv-modal-overlay">
          <div className="inv-modal-content" style={{ maxWidth: '750px' }}>
            <div className="inv-modal-header">
              <h3>Dispatch Inter-Branch Stock Transfer</h3>
              <button type="button" className="inv-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleDispatch}>
              <div className="inv-modal-body">
                {error && <div className="inv-alert-banner inv-alert-danger">{error}</div>}

                <div className="inv-form-row">
                  <div className="inv-form-group">
                    <label>Source Branch (Stock Deducted) *</label>
                    <select
                      className="inv-form-control"
                      value={fromBranch}
                      onChange={(e) => setFromBranch(e.target.value)}
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="inv-form-group">
                    <label>Destination Branch (Receiving) *</label>
                    <select
                      className="inv-form-control"
                      value={toBranch}
                      onChange={(e) => setToBranch(e.target.value)}
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700 }}>TRANSFER ITEMS</label>
                    <button type="button" className="inv-btn inv-btn-sm inv-btn-secondary" onClick={addLine}>
                      + Add Item
                    </button>
                  </div>

                  {transferLines.map((line, idx) => {
                    const selectedIng = ingredients.find(i => i.id === line.ingredientId);
                    const sourceAvailable = selectedIng ? Number(selectedIng.stockByBranch?.[fromBranch] || 0) : 0;

                    return (
                      <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                        <select
                          className="inv-form-control"
                          style={{ flex: 3 }}
                          value={line.ingredientId}
                          onChange={(e) => handleLineChange(idx, 'ingredientId', e.target.value)}
                          required
                        >
                          <option value="">Select Ingredient...</option>
                          {ingredients.map(ing => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} (Avail: {ing.stockByBranch?.[fromBranch] || 0} {ing.baseUnit})
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          max={sourceAvailable > 0 ? sourceAvailable : undefined}
                          className="inv-form-control"
                          placeholder="Transfer Qty"
                          style={{ flex: 1.5 }}
                          value={line.qty}
                          onChange={(e) => handleLineChange(idx, 'qty', e.target.value)}
                          required
                        />

                        <span style={{ fontSize: '12px', width: '60px', color: 'var(--color-text-muted)' }}>
                          {selectedIng?.baseUnit || 'unit'}
                        </span>

                        {transferLines.length > 1 && (
                          <button
                            type="button"
                            className="inv-btn inv-btn-sm inv-btn-danger"
                            onClick={() => removeLine(idx)}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="inv-form-group">
                  <label>Transfer Notes & Van / Driver Details</label>
                  <textarea
                    className="inv-form-control"
                    rows="2"
                    placeholder="Courier dispatch note, driver contact, vehicle registration..."
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="inv-modal-footer">
                <button type="button" className="inv-btn inv-btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="inv-btn inv-btn-primary">
                  Dispatch Transfer (Deduct Source Stock)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
