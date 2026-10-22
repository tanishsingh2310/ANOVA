import { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { MovementService } from '../services/movementService';
import { InventoryService } from '../services/inventoryService';

export default function WastagePage({ branchId, branches = [] }) {
  const [wastageList, setWastageList] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState('ALL');
  const [selectedBranch, setSelectedBranch] = useState(branchId || 'all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetBranch, setTargetBranch] = useState(branchId === 'all' ? (branches[0]?.id || branches[0]?._id || '') : branchId);
  const [selectedIngId, setSelectedIngId] = useState('');
  const [wasteQty, setWasteQty] = useState('');
  const [reason, setReason] = useState('EXPIRED');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [viewNotesTarget, setViewNotesTarget] = useState(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [notice, setNotice] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setSelectedBranch(branchId);
    if (branchId !== 'all') setTargetBranch(branchId);
  }, [branchId]);

  const loadData = async (refresh = false) => {
    const list = MovementService.getWastage({
      branchId: selectedBranch,
      reason: reasonFilter
    });
    setWastageList(list);
    setIngredients(InventoryService.getIngredients());

    setIsSyncing(true);
    try {
      await Promise.all([
        MovementService.syncWastageFromBackend(selectedBranch),
        InventoryService.syncFromBackend(selectedBranch)
      ]);
      const fresh = MovementService.getWastage({
        branchId: selectedBranch,
        reason: reasonFilter
      });
      setWastageList(fresh);
      setIngredients(InventoryService.getIngredients());
      if (refresh) setNotice('Wastage log refreshed.');
    } catch (err) {
      console.warn('Wastage sync error:', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranch, reasonFilter]);

  const handleRecordWaste = async (e) => {
    e.preventDefault();
    if (!selectedIngId || !wasteQty || Number(wasteQty) <= 0) {
      setError('Please choose an ingredient and enter a positive quantity');
      return;
    }

    try {
      await MovementService.logWastageRemote({
        branchId: targetBranch || (branches[0]?.id || branches[0]?._id),
        ingredientId: selectedIngId,
        qty: Number(wasteQty),
        reason,
        notes,
        loggedBy: 'Kitchen Staff'
      });
      await InventoryService.syncFromBackend(targetBranch || selectedBranch);

      setIsModalOpen(false);
      setSelectedIngId('');
      setWasteQty('');
      setNotes('');
      setError('');
      setNotice('Wastage recorded and stock written off successfully.');
      loadData();
    } catch (err) {
      setError(err.message || 'Wastage logging failed');
    }
  };

  const handleDeleteWastage = async (w) => {
    if (!w || deleting) return;
    setDeleting(true);
    setError('');
    setNotice('');
    try {
      await MovementService.deleteWastageRemote(w.id || w._id);
      setDeleteConfirmTarget(null);
      setNotice(`Wastage record ${w.wasteNumber} deleted.`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete record');
    } finally {
      setDeleting(false);
    }
  };

  const branchMap = {};
  branches.forEach(b => { branchMap[b.id || b._id] = b.name; });

  const ingredientMap = {};
  ingredients.forEach(i => { ingredientMap[i.id] = i.name; });

  const filteredWastage = wastageList.filter((w) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const wNum = (w.wasteNumber || '').toLowerCase();
    const ingName = (ingredientMap[w.ingredientId] || '').toLowerCase();
    return wNum.includes(q) || ingName.includes(q);
  });

  return (
    <div className="employees-page">
      {/* Heading matching Images 1-4 */}
      <div className="employees-heading">
        <div>
          <h2>Wastage & Spoilage</h2>
          <p>Log discarded ingredients, kitchen prep losses, and track write-offs.</p>
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
            + Record wastage
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
            placeholder="Search log number or ingredient..."
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
          <span>Loss reason</span>
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
          >
            <option value="ALL">All loss reasons</option>
            <option value="EXPIRED">Expired Stock</option>
            <option value="SPOILED">Spoiled / Temperature Fluctuation</option>
            <option value="PREP_LOSS">Kitchen Preparation Loss</option>
            <option value="HANDLING_DAMAGE">Handling Damage / Spillage</option>
          </select>
        </label>
      </div>

      {/* Table Card matching People & HR and Actions from Image 5 */}
      <div className="employees-table-card">
        <div className="employees-table-heading">
          <div>
            <h3>Wastage Log</h3>
            <p>
              {filteredWastage.length} result{filteredWastage.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {filteredWastage.length === 0 ? (
          <div className="employees-empty-state">
            <AlertTriangle size={26} />
            <h3>No wastage records found</h3>
            <p>Try changing the filters or record a new wastage write-off.</p>
          </div>
        ) : (
          <div className="employees-table-scroll">
            <table className="employees-table">
              <thead>
                <tr>
                  <th>Log #</th>
                  <th>Branch</th>
                  <th>Ingredient</th>
                  <th>Qty Discarded</th>
                  <th>Unit Cost</th>
                  <th>Financial Loss</th>
                  <th>Reason</th>
                  <th>Reported By</th>
                  <th>Date & Time</th>
                  <th style={{ width: '190px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredWastage.map((w) => (
                  <tr key={w.id || w._id}>
                    <td><code>{w.wasteNumber}</code></td>
                    <td>{branchMap[w.branchId] || w.branchId}</td>
                    <td><strong>{ingredientMap[w.ingredientId] || w.ingredientId}</strong></td>
                    <td style={{ color: '#b91c1c', fontWeight: 700 }}>
                      -{w.qty} {w.unit}
                    </td>
                    <td>₹{w.unitCost}</td>
                    <td>
                      <strong style={{ color: '#b91c1c' }}>₹{Number(w.totalCost || 0).toLocaleString()}</strong>
                    </td>
                    <td>
                      <span className="employees-status is-danger">
                        {String(w.reason || 'WASTE').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{w.loggedBy || 'Kitchen Staff'}</td>
                    <td>{w.date ? w.date.replace('T', ' ').slice(0, 16) : '-'}</td>
                    <td>
                      {/* Image 5: View Notes | Delete Action Group */}
                      <div className="employees-row-actions">
                        <button
                          type="button"
                          className="employees-button employees-button-secondary"
                          onClick={() => setViewNotesTarget(w)}
                        >
                          <Pencil size={15} />
                          Notes
                        </button>

                        <button
                          type="button"
                          className="employees-button employees-button-danger"
                          onClick={() => setDeleteConfirmTarget(w)}
                          title={`Delete Log ${w.wasteNumber}`}
                          aria-label={`Delete Log ${w.wasteNumber}`}
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

      {/* RECORD WASTAGE MODAL */}
      {isModalOpen && (
        <div
          className="employees-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="employees-modal" role="dialog" aria-modal="true">
            <div className="employees-modal-heading">
              <div>
                <p className="employees-eyebrow">INVENTORY WRITE-OFF</p>
                <h3>Record Wastage / Spoilage</h3>
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

            <form onSubmit={handleRecordWaste}>
              <div className="employees-form-grid">
                <label>
                  Branch Location *
                  <select
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Ingredient *
                  <select
                    value={selectedIngId}
                    onChange={(e) => setSelectedIngId(e.target.value)}
                    required
                  >
                    <option value="">Select ingredient</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>{ing.name} ({ing.sku})</option>
                    ))}
                  </select>
                </label>

                <label>
                  Quantity Discarded *
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={wasteQty}
                    onChange={(e) => setWasteQty(e.target.value)}
                    placeholder="e.g. 2.5"
                    required
                  />
                </label>

                <label>
                  Loss Reason *
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  >
                    <option value="EXPIRED">Expired Past Best-Before</option>
                    <option value="SPOILED">Spoiled / Quality Degradation</option>
                    <option value="PREP_LOSS">Kitchen Prep Loss / Trimming</option>
                    <option value="HANDLING_DAMAGE">Handling Damage / Accidental Spill</option>
                  </select>
                </label>

                <label className="employees-field-full">
                  Detailed Notes / Root Cause
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Explain causes for loss analysis and preventative action"
                  />
                </label>
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
                  className="employees-button employees-button-danger"
                >
                  Confirm Write-off
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW NOTES MODAL */}
      {viewNotesTarget && (
        <div
          className="employees-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewNotesTarget(null);
          }}
        >
          <div className="employees-modal" role="dialog" aria-modal="true" style={{ maxWidth: '500px' }}>
            <div className="employees-modal-heading">
              <div>
                <p className="employees-eyebrow">WASTAGE AUDIT</p>
                <h3>{viewNotesTarget.wasteNumber} Notes</h3>
              </div>
              <button
                type="button"
                className="employees-modal-close"
                onClick={() => setViewNotesTarget(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ fontSize: '13px', color: '#52645a', lineHeight: 1.6 }}>
              <p><strong>Ingredient:</strong> {ingredientMap[viewNotesTarget.ingredientId] || viewNotesTarget.ingredientId}</p>
              <p><strong>Quantity:</strong> -{viewNotesTarget.qty} {viewNotesTarget.unit}</p>
              <p><strong>Financial Impact:</strong> ₹{Number(viewNotesTarget.totalCost || 0).toLocaleString()}</p>
              <p><strong>Reason:</strong> {viewNotesTarget.reason}</p>
              <p><strong>Reported By:</strong> {viewNotesTarget.loggedBy || 'Staff'}</p>
              <p><strong>Notes:</strong> {viewNotesTarget.notes || 'No extra notes provided.'}</p>
            </div>
            <div className="employees-form-actions">
              <button
                type="button"
                className="employees-button employees-button-secondary"
                onClick={() => setViewNotesTarget(null)}
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
            aria-labelledby="delete-wastage-title"
            aria-describedby="delete-wastage-description"
          >
            <div className="employees-delete-icon">
              <Trash2 size={24} />
            </div>

            <h3 id="delete-wastage-title">Delete Wastage Log?</h3>

            <p id="delete-wastage-description">
              Are you sure you want to permanently delete wastage record <strong>{deleteConfirmTarget.wasteNumber}</strong>? This action cannot be undone.
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
                onClick={() => handleDeleteWastage(deleteConfirmTarget)}
                disabled={deleting}
              >
                <Trash2 size={16} />
                {deleting ? 'Deleting...' : 'Delete Wastage Log'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
