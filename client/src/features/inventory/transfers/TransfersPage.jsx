import { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  ArrowRightLeft
} from 'lucide-react';
import { MovementService } from '../services/movementService';
import { InventoryService } from '../services/inventoryService';

export default function TransfersPage({ branchId, branches = [] }) {
  const [transfers, setTransfers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedBranch, setSelectedBranch] = useState(branchId || 'all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fromBranch, setFromBranch] = useState(branches[0]?.id || branches[0]?._id || '');
  const [toBranch, setToBranch] = useState(branches[1]?.id || branches[1]?._id || branches[0]?.id || branches[0]?._id || '');
  const [transferLines, setTransferLines] = useState([{ ingredientId: '', qty: '' }]);
  const [transferNotes, setTransferNotes] = useState('');
  const [error, setError] = useState('');
  const [viewDetailsTarget, setViewDetailsTarget] = useState(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [notice, setNotice] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setSelectedBranch(branchId);
    if (branchId !== 'all') setFromBranch(branchId);
  }, [branchId]);

  const loadData = async (refresh = false) => {
    const list = MovementService.getTransfers({
      branchId: selectedBranch,
      status: statusFilter
    });
    setTransfers(list);
    setIngredients(InventoryService.getIngredients());

    setIsSyncing(true);
    try {
      await Promise.all([
        MovementService.syncTransfersFromBackend(selectedBranch),
        InventoryService.syncFromBackend(selectedBranch)
      ]);
      const fresh = MovementService.getTransfers({
        branchId: selectedBranch,
        status: statusFilter
      });
      setTransfers(fresh);
      setIngredients(InventoryService.getIngredients());
      if (refresh) setNotice('Transfers refreshed.');
    } catch (err) {
      console.warn('Transfers sync error:', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranch, statusFilter]);

  const handleReceive = async (transferId) => {
    try {
      await MovementService.receiveTransferRemote({
        transferId,
        receivedBy: 'Store Manager'
      });
      await InventoryService.syncFromBackend(selectedBranch);
      setNotice('Transfer received and stock credited successfully.');
      loadData();
    } catch (err) {
      alert(err.message || 'Error receiving transfer');
    }
  };

  const handleAddLine = () => {
    setTransferLines([...transferLines, { ingredientId: '', qty: '' }]);
  };

  const handleRemoveLine = (idx) => {
    setTransferLines(transferLines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (index, field, value) => {
    const updated = [...transferLines];
    updated[index][field] = value;
    setTransferLines(updated);
  };

  const handleDispatchTransfer = async (e) => {
    e.preventDefault();
    if (fromBranch === toBranch) {
      setError('Origin and destination branches must be different');
      return;
    }
    if (!transferLines.some(l => l.ingredientId && Number(l.qty) > 0)) {
      setError('Please add at least one line item with a positive quantity');
      return;
    }

    try {
      await MovementService.dispatchTransferRemote({
        fromBranchId: fromBranch,
        toBranchId: toBranch,
        items: transferLines.filter(l => l.ingredientId && Number(l.qty) > 0).map(l => {
          const ing = ingredients.find(i => i.id === l.ingredientId);
          return {
            ingredientId: l.ingredientId,
            qty: Number(l.qty),
            unit: ing?.baseUnit || 'kg',
            unitCost: ing?.unitCost || 0
          };
        }),
        notes: transferNotes,
        dispatchedBy: 'Logistics Supervisor'
      });
      await InventoryService.syncFromBackend(selectedBranch);

      setIsModalOpen(false);
      setTransferLines([{ ingredientId: '', qty: '' }]);
      setTransferNotes('');
      setError('');
      setNotice('Transfer dispatched successfully.');
      loadData();
    } catch (err) {
      setError(err.message || 'Transfer dispatch failed');
    }
  };

  const handleDeleteTransfer = async (tr) => {
    if (!tr || deleting) return;
    setDeleting(true);
    setError('');
    setNotice('');
    try {
      await MovementService.deleteTransferRemote(tr.id || tr._id);
      setDeleteConfirmTarget(null);
      setNotice(`Transfer ${tr.transferNumber} deleted.`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete transfer');
    } finally {
      setDeleting(false);
    }
  };

  const branchMap = {};
  branches.forEach(b => { branchMap[b.id || b._id] = b.name; });

  const ingredientMap = {};
  ingredients.forEach(i => { ingredientMap[i.id] = i.name; });

  const filteredTransfers = transfers.filter((tr) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const tNum = (tr.transferNumber || '').toLowerCase();
    const fromB = (branchMap[tr.fromBranchId] || '').toLowerCase();
    const toB = (branchMap[tr.toBranchId] || '').toLowerCase();
    return tNum.includes(q) || fromB.includes(q) || toB.includes(q);
  });

  return (
    <div className="employees-page">
      {/* Heading matching Images 1-4 */}
      <div className="employees-heading">
        <div>
          <h2>Transfers</h2>
          <p>Track and dispatch inter-branch inventory stock transfers.</p>
        </div>

        <div className="employees-heading-actions">
          <button
            type="button"
            className="employees-button employees-button-primary"
            onClick={() => {
              setError('');
              setIsModalOpen(true);
            }}
          >
            <Plus size={16} />
            + Dispatch transfer
          </button>
          <button
            type="button"
            className="employees-button employees-button-secondary"
            onClick={() => loadData(true)}
            disabled={isSyncing}
          >
            <RefreshCw size={16} className={isSyncing ? 'employees-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {notice && (
        <div className="employees-notice" role="status">
          {notice}
        </div>
      )}

      {error && (
        <div className="employees-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Toolbar matching Images 1-4 */}
      <div className="employees-toolbar">
        <label className="employees-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search transfer number, origin, or destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <label className="employees-filter">
          <span>Branch</span>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="all">All branches</option>
            {branches.map((b) => (
              <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>
            ))}
          </select>
        </label>

        <label className="employees-filter">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="IN_TRANSIT">In-Transit</option>
            <option value="RECEIVED">Received & Stocked</option>
          </select>
        </label>
      </div>

      {/* Table Card matching People & HR and Actions from Image 5 */}
      <div className="employees-table-card">
        <div className="employees-table-heading">
          <div>
            <h3>Inter-Branch Transfers</h3>
            <p>
              {filteredTransfers.length} result{filteredTransfers.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {filteredTransfers.length === 0 ? (
          <div className="employees-empty-state">
            <ArrowRightLeft size={26} />
            <h3>No transfer records found</h3>
            <p>Try changing the filters or dispatch a new branch transfer.</p>
          </div>
        ) : (
          <div className="employees-table-scroll">
            <table className="employees-table">
              <thead>
                <tr>
                  <th>Transfer #</th>
                  <th>Origin Branch</th>
                  <th>Destination Branch</th>
                  <th>Items Transferred</th>
                  <th>Dispatched Time</th>
                  <th>Status</th>
                  <th style={{ width: '230px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.map((tr) => (
                  <tr key={tr.id || tr._id}>
                    <td>
                      <code>{tr.transferNumber}</code>
                    </td>
                    <td>{branchMap[tr.fromBranchId] || tr.fromBranchId}</td>
                    <td>{branchMap[tr.toBranchId] || tr.toBranchId}</td>
                    <td>
                      {(tr.items || []).map((it, idx) => (
                        <div key={idx} style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                          • <strong>{ingredientMap[it.ingredientId] || it.ingredientName || it.ingredientId}</strong>: {it.qty} {it.unit}
                        </div>
                      ))}
                    </td>
                    <td>
                      <div>{tr.dispatchedAt ? tr.dispatchedAt.replace('T', ' ').slice(0, 16) : '-'}</div>
                      <span style={{ fontSize: '11px', color: '#748078' }}>by {tr.dispatchedBy || 'Staff'}</span>
                    </td>
                    <td>
                      <span
                        className={`employees-status ${
                          tr.status === 'RECEIVED' ? 'is-received' : 'is-in-transit'
                        }`}
                      >
                        {tr.status === 'RECEIVED' ? 'Received' : 'In-Transit'}
                      </span>
                    </td>
                    <td>
                      {/* Image 5: View | Receive | Delete Action Group */}
                      <div className="employees-row-actions">
                        <button
                          type="button"
                          className="employees-button employees-button-secondary"
                          onClick={() => setViewDetailsTarget(tr)}
                        >
                          <Pencil size={15} />
                          View
                        </button>

                        {tr.status === 'IN_TRANSIT' ? (
                          <button
                            type="button"
                            className="employees-button employees-button-secondary"
                            onClick={() => handleReceive(tr.id || tr._id)}
                          >
                            Receive
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="employees-button employees-button-secondary"
                            disabled
                          >
                            Done
                          </button>
                        )}

                        <button
                          type="button"
                          className="employees-button employees-button-danger"
                          onClick={() => setDeleteConfirmTarget(tr)}
                          title={`Cancel Transfer ${tr.transferNumber}`}
                          aria-label={`Cancel Transfer ${tr.transferNumber}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DISPATCH NEW TRANSFER MODAL */}
      {isModalOpen && (
        <div
          className="employees-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="employees-modal" role="dialog" aria-modal="true" style={{ maxWidth: '700px' }}>
            <div className="employees-modal-heading">
              <div>
                <p className="employees-eyebrow">BRANCH DISPATCH</p>
                <h3>Dispatch Stock Transfer</h3>
              </div>
              <button
                type="button"
                className="employees-modal-close"
                onClick={() => setIsModalOpen(false)}
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

            <form onSubmit={handleDispatchTransfer}>
              <div className="employees-form-grid">
                <label>
                  Origin Branch (Source) *
                  <select
                    value={fromBranch}
                    onChange={(e) => setFromBranch(e.target.value)}
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Destination Branch (Target) *
                  <select
                    value={toBranch}
                    onChange={(e) => setToBranch(e.target.value)}
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>
                    ))}
                  </select>
                </label>

                <label className="employees-field-full">
                  Transfer Dispatch Notes
                  <input
                    type="text"
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    placeholder="e.g. Urgently requested for evening service rush"
                  />
                </label>
              </div>

              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#52645b' }}>Transfer Items</span>
                  <button
                    type="button"
                    className="employees-button employees-button-secondary"
                    onClick={handleAddLine}
                    style={{ minHeight: '30px', height: '30px', padding: '4px 8px' }}
                  >
                    + Add Item
                  </button>
                </div>

                {transferLines.map((line, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                    <select
                      value={line.ingredientId}
                      onChange={(e) => handleLineChange(idx, 'ingredientId', e.target.value)}
                      required
                    >
                      <option value="">Select Ingredient</option>
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>{ing.name} ({ing.sku})</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Quantity"
                      min="0.1"
                      step="any"
                      value={line.qty}
                      onChange={(e) => handleLineChange(idx, 'qty', e.target.value)}
                      required
                    />
                    {transferLines.length > 1 && (
                      <button
                        type="button"
                        className="employees-button employees-button-danger"
                        onClick={() => handleRemoveLine(idx)}
                        style={{ minHeight: '33px', height: '33px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="employees-form-actions">
                <button
                  type="button"
                  className="employees-button employees-button-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="employees-button employees-button-primary"
                >
                  Dispatch Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewDetailsTarget && (
        <div
          className="employees-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewDetailsTarget(null);
          }}
        >
          <div className="employees-modal" role="dialog" aria-modal="true" style={{ maxWidth: '600px' }}>
            <div className="employees-modal-heading">
              <div>
                <p className="employees-eyebrow">TRANSFER RECORD</p>
                <h3>{viewDetailsTarget.transferNumber}</h3>
              </div>
              <button
                type="button"
                className="employees-modal-close"
                onClick={() => setViewDetailsTarget(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '16px', fontSize: '13px', color: '#52645a' }}>
              <p><strong>From:</strong> {branchMap[viewDetailsTarget.fromBranchId] || viewDetailsTarget.fromBranchId}</p>
              <p><strong>To:</strong> {branchMap[viewDetailsTarget.toBranchId] || viewDetailsTarget.toBranchId}</p>
              <p><strong>Status:</strong> {viewDetailsTarget.status}</p>
              <p><strong>Dispatched:</strong> {viewDetailsTarget.dispatchedAt || '—'}</p>
              <p><strong>Received:</strong> {viewDetailsTarget.receivedAt || 'Pending in-transit'}</p>
            </div>

            <span style={{ fontSize: '12px', fontWeight: 700, color: '#52645b', display: 'block', marginBottom: '8px' }}>Transferred Ingredients</span>
            <div className="employees-table-scroll" style={{ marginBottom: '20px' }}>
              <table className="employees-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewDetailsTarget.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td><strong>{ingredientMap[it.ingredientId] || it.ingredientName || it.ingredientId}</strong></td>
                      <td>{it.qty} {it.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="employees-form-actions">
              <button
                type="button"
                className="employees-button employees-button-secondary"
                onClick={() => setViewDetailsTarget(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Standardized) */}
      {deleteConfirmTarget && (
        <div
          className="employees-delete-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteConfirmTarget(null);
          }}
        >
          <div
            className="employees-delete-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-transfer-title"
            aria-describedby="delete-transfer-description"
          >
            <div className="employees-delete-icon">
              <Trash2 size={24} />
            </div>

            <h3 id="delete-transfer-title">Delete Transfer?</h3>

            <p id="delete-transfer-description">
              Are you sure you want to permanently delete transfer <strong>{deleteConfirmTarget.transferNumber}</strong>? This action cannot be undone.
            </p>

            <div className="employees-delete-actions">
              <button
                type="button"
                className="employees-button employees-button-secondary"
                onClick={() => setDeleteConfirmTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="employees-button employees-button-danger"
                onClick={() => handleDeleteTransfer(deleteConfirmTarget)}
                disabled={deleting}
              >
                <Trash2 size={16} />
                {deleting ? 'Deleting...' : 'Delete Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
