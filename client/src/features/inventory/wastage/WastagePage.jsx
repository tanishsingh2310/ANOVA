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
import InventoryPagination from '../components/InventoryPagination';

export default function WastagePage({ branchId, branches = [] }) {
  const [wastageList, setWastageList] = useState(() => {
    const list = MovementService.getWastage({ branchId });
    return Array.isArray(list) ? list : [];
  });
  const [ingredients, setIngredients] = useState(() => InventoryService.getIngredients());
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState('ALL');
  const [selectedBranch, setSelectedBranch] = useState(branchId || 'all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetBranch, setTargetBranch] = useState(
    branchId && branchId !== 'all'
      ? branchId
      : (Array.isArray(branches) && branches[0] ? (branches[0].id || branches[0]._id || '') : '')
  );
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
    setSelectedBranch(branchId || 'all');
    if (branchId && branchId !== 'all') {
      setTargetBranch(branchId);
    } else if (Array.isArray(branches) && branches.length > 0 && !targetBranch) {
      setTargetBranch(branches[0].id || branches[0]._id || '');
    }
  }, [branchId, branches]);

  const loadData = async (refresh = false) => {
    setIsSyncing(true);
    setError('');
    try {
      const [remoteWastage] = await Promise.all([
        MovementService.syncWastageFromBackend(selectedBranch),
        InventoryService.syncFromBackend(selectedBranch)
      ]);
      setWastageList(Array.isArray(remoteWastage) ? remoteWastage : (Array.isArray(MovementService.getWastage({ branchId: selectedBranch })) ? MovementService.getWastage({ branchId: selectedBranch }) : []));
      const freshIngs = InventoryService.getIngredients();
      setIngredients(Array.isArray(freshIngs) ? freshIngs : []);
      if (refresh) setNotice('Wastage log refreshed.');
    } catch (err) {
      console.error('Wastage sync error:', err.message);
      setError(err.message || 'Failed to load wastage records');
      const fallback = MovementService.getWastage({ branchId: selectedBranch });
      setWastageList(Array.isArray(fallback) ? fallback : []);
      setIngredients(InventoryService.getIngredients());
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
  if (Array.isArray(branches)) {
    branches.forEach(b => {
      if (b) {
        if (b.id) branchMap[String(b.id)] = b.name;
        if (b._id) branchMap[String(b._id)] = b.name;
        if (b.code) {
          branchMap[String(b.code)] = b.name;
          branchMap[String(b.code).toLowerCase()] = b.name;
          branchMap[String(b.code).toUpperCase()] = b.name;
        }
      }
    });
  }

  const formatBranch = (val) => {
    if (!val) return '—';
    const str = String(val);
    if (branchMap[str]) return branchMap[str];
    if (branchMap[str.toLowerCase()]) return branchMap[str.toLowerCase()];
    if (str.startsWith('b_')) {
      const clean = str.slice(2).replace(/_/g, ' ');
      return clean.charAt(0).toUpperCase() + clean.slice(1) + ' Branch';
    }
    return str;
  };

  const ingredientMap = {};
  if (Array.isArray(ingredients)) {
    ingredients.forEach(i => {
      if (i) {
        if (i.id) ingredientMap[String(i.id)] = i.name;
        if (i._id) ingredientMap[String(i._id)] = i.name;
        if (i.sku) ingredientMap[String(i.sku)] = i.name;
        if (i.code) ingredientMap[String(i.code)] = i.name;
      }
    });
  }

  const formatIngredient = (w) => {
    if (!w) return 'General Inventory Item';
    if (w.ingredientName && w.ingredientName.trim() && w.ingredientName !== 'Unknown Ingredient') {
      return w.ingredientName;
    }
    if (typeof w.ingredient === 'object' && w.ingredient?.name) {
      return w.ingredient.name;
    }
    const idKey = String(w.ingredientId || (typeof w.ingredient === 'string' ? w.ingredient : '') || '');
    if (idKey && ingredientMap[idKey]) {
      return ingredientMap[idKey];
    }
    if (idKey.startsWith('ing_') || idKey.startsWith('item_')) {
      const clean = idKey.replace(/^(ing_|item_)/, '').replace(/_/g, ' ');
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    }
    return 'General Inventory Item';
  };

  const formatReportedBy = (val) => {
    if (!val) return 'Kitchen Staff';
    if (typeof val === 'string' && val.startsWith('usr_')) {
      const withoutPrefix = val.replace('usr_', '');
      const parts = withoutPrefix.split('_b_');
      const role = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Staff';
      if (parts[1]) {
        const bName = formatBranch('b_' + parts[1]);
        return `${role} (${bName})`;
      }
      return role;
    }
    return val;
  };

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedBranch, reasonFilter]);

  const branchMatches = (branchVal, target) => {
    if (!target || target === 'all') return true;
    if (!branchVal) return false;
    const bId = typeof branchVal === 'object' ? (branchVal.id || branchVal._id || branchVal.code) : branchVal;
    const b = branches.find(item => item.id === target || item._id === target || item.code === target);
    const candidates = [target, b?.id, b?._id, b?.code].filter(Boolean).map(String);
    return candidates.includes(String(bId));
  };

  const safeWastageList = Array.isArray(wastageList) ? wastageList : [];
  const filteredWastage = safeWastageList.filter((w) => {
    if (!w) return false;

    // Reason filter
    if (reasonFilter && reasonFilter !== 'ALL' && w.reason !== reasonFilter) {
      return false;
    }

    // Branch filter
    if (selectedBranch && selectedBranch !== 'all' && !branchMatches(w.branchId || w.branch, selectedBranch)) {
      return false;
    }

    // Search query
    if (search && search.trim() !== '') {
      const q = search.toLowerCase();
      const wNum = String(w.wasteNumber || '').toLowerCase();
      const ingName = String(formatIngredient(w)).toLowerCase();
      const bName = String(formatBranch(w.branchId || w.branch)).toLowerCase();
      const rName = String(w.reason || '').toLowerCase();
      const notes = String(w.notes || '').toLowerCase();
      return wNum.includes(q) || ingName.includes(q) || bName.includes(q) || rName.includes(q) || notes.includes(q);
    }

    return true;
  });

  const totalItems = filteredWastage.length;
  const paginatedWastage = filteredWastage.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="employees-page">
      {/* Heading matching Images 1-4 */}
      <div className="employees-heading">
        <div>
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
            Record wastage
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
                  <th style={{ whiteSpace: 'nowrap', minWidth: '150px' }}>Log</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Branch</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Ingredient</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Qty Discarded</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Unit Cost</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Financial Loss</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Reason</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Reported By</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Date & Time</th>
                  <th style={{ width: '150px', minWidth: '150px', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedWastage.map((w) => {
                  if (!w) return null;
                  const recordKey = w.id || w._id || Math.random().toString();
                  const dateStr = w.date
                    ? (typeof w.date === 'string'
                        ? w.date.replace('T', ' ').slice(0, 16)
                        : new Date(w.date).toISOString().replace('T', ' ').slice(0, 16))
                    : '—';
                  const ingName = formatIngredient(w);
                  const branchName = formatBranch(w.branchId || w.branch);

                  return (
                    <tr key={recordKey}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <code>{w.wasteNumber || `WST-${String(recordKey).slice(-6).toUpperCase()}`}</code>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{branchName}</td>
                      <td><strong>{ingName}</strong></td>
                      <td style={{ color: '#b91c1c', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        -{w.qty} {w.unit || 'kg'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>₹{Number(w.unitCost || 0).toLocaleString()}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <strong style={{ color: '#b91c1c' }}>₹{Number(w.totalCost || 0).toLocaleString()}</strong>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className="employees-status is-danger">
                          {String(w.reason || 'WASTE').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatReportedBy(w.loggedBy)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{dateStr}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {/* View Notes | Delete Action Group */}
                        <div className="employees-row-actions" style={{ display: 'inline-flex', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
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
                            title={`Delete Log ${w.wasteNumber || recordKey}`}
                            aria-label={`Delete Log ${w.wasteNumber || recordKey}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <InventoryPagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
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
                    {Array.isArray(branches) && branches.map((b) => (
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
                    {Array.isArray(ingredients) && ingredients.map((ing) => (
                      <option key={ing.id || ing._id} value={ing.id || ing._id}>{ing.name} ({ing.sku})</option>
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
              <p><strong>Ingredient:</strong> {ingredientMap[viewNotesTarget.ingredientId] || viewNotesTarget.ingredientName || viewNotesTarget.ingredientId || '-'}</p>
              <p><strong>Quantity:</strong> -{viewNotesTarget.qty} {viewNotesTarget.unit || 'kg'}</p>
              <p><strong>Financial Impact:</strong> ₹{Number(viewNotesTarget.totalCost || 0).toLocaleString()}</p>
              <p><strong>Reason:</strong> {viewNotesTarget.reason || '-'}</p>
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
              Are you sure you want to permanently delete wastage record <strong>{deleteConfirmTarget.wasteNumber || deleteConfirmTarget.id || deleteConfirmTarget._id}</strong>? This action cannot be undone.
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
