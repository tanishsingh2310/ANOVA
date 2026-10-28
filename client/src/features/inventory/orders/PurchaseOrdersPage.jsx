import { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  ShoppingBag
} from 'lucide-react';
import { PurchaseOrderService } from '../services/purchaseOrderService';
import { SupplierService } from '../services/supplierService';
import { InventoryService } from '../services/inventoryService';
import InventoryPagination from '../components/InventoryPagination';

export default function PurchaseOrdersPage({ branchId, branches = [] }) {
  const [orders, setOrders] = useState(() => PurchaseOrderService.getPurchaseOrders({ branchId }, branches));
  const [suppliers, setSuppliers] = useState(() => SupplierService.getSuppliers());
  const [ingredients, setIngredients] = useState(() => InventoryService.getIngredients());

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [selectedBranch, setSelectedBranch] = useState(branchId || 'all');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [receivingPO, setReceivingPO] = useState(null);
  const [viewHistoryPO, setViewHistoryPO] = useState(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Create PO Form
  const [newPoBranch, setNewPoBranch] = useState(branchId === 'all' ? (branches[0]?.id || branches[0]?._id || '') : branchId);
  const [newPoSupplier, setNewPoSupplier] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [lineItems, setLineItems] = useState([
    { ingredientId: '', orderedQty: '', unitPrice: '', unit: 'kg' }
  ]);
  const [createError, setCreateError] = useState('');

  // Goods Receiving Note (GRN) Form
  const [grnNumber, setGrnNumber] = useState('');
  const [grnReceiptItems, setGrnReceiptItems] = useState([]);
  const [grnNotes, setGrnNotes] = useState('');
  const [grnError, setGrnError] = useState('');

  const [notice, setNotice] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setSelectedBranch(branchId);
    if (branchId !== 'all') setNewPoBranch(branchId);
  }, [branchId]);

  const loadData = async (refresh = false) => {
    setIsSyncing(true);
    setError('');
    try {
      const [remotePOs] = await Promise.all([
        PurchaseOrderService.syncFromBackend(selectedBranch, branches),
        SupplierService.syncFromBackend(),
        InventoryService.syncFromBackend(selectedBranch)
      ]);
      setOrders(Array.isArray(remotePOs) ? remotePOs : PurchaseOrderService.getPurchaseOrders({ branchId: selectedBranch }, branches));
      setSuppliers(SupplierService.getSuppliers());
      setIngredients(InventoryService.getIngredients());
      if (refresh) setNotice('Purchase orders refreshed.');
    } catch (err) {
      console.error('PurchaseOrders sync error:', err.message);
      setError(err.message || 'Failed to load purchase orders from database');
      setOrders(PurchaseOrderService.getPurchaseOrders({ branchId: selectedBranch }, branches));
      setSuppliers(SupplierService.getSuppliers());
      setIngredients(InventoryService.getIngredients());
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranch, statusFilter, supplierFilter, branches]);

  const handleTransition = async (poId, nextStatus) => {
    try {
      await PurchaseOrderService.updateStatusRemote(poId, nextStatus, 'Procurement Manager');
      setNotice(`Order updated to ${nextStatus}.`);
      loadData();
    } catch (err) {
      alert(err.message || 'Status transition error');
    }
  };

  const handleOpenReceive = (po) => {
    setReceivingPO(po);
    setGrnNumber(`GRN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setGrnError('');
    setGrnNotes('');
    const items = po.items.map(it => {
      const remaining = Math.max(0, it.orderedQty - ((it.receivedQty || 0) + (it.rejectedQty || 0) + (it.damagedQty || 0)));
      return {
        ingredientId: it.ingredientId,
        orderedQty: it.orderedQty,
        acceptedQty: remaining,
        rejectedQty: 0,
        damagedQty: 0,
        unit: it.unit,
        unitCost: it.unitPrice,
        batchNumber: `BAT-${Date.now().toString().slice(-4)}`,
        expiryDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
      };
    });
    setGrnReceiptItems(items);
  };

  const handleProcessGRN = async (e) => {
    e.preventDefault();
    try {
      await PurchaseOrderService.receiveGoodsRemote({
        poId: receivingPO.id || receivingPO._id || receivingPO.poNumber,
        grnNumber,
        receiverName: 'Receiving Officer',
        receiptItems: grnReceiptItems,
        notes: grnNotes
      });
      await InventoryService.syncFromBackend(receivingPO.branchId);
      setReceivingPO(null);
      setNotice(`Goods receipt note ${grnNumber} processed successfully.`);
      loadData();
    } catch (err) {
      setGrnError(err.message || 'GRN submission failed');
    }
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { ingredientId: '', orderedQty: '', unitPrice: '', unit: 'kg' }]);
  };

  const handleRemoveLineItem = (idx) => {
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const handleLineChange = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    if (field === 'ingredientId') {
      const ing = ingredients.find(i => i.id === value);
      if (ing) {
        updated[index].unit = ing.baseUnit;
        updated[index].unitPrice = ing.unitCost;
      }
    }
    setLineItems(updated);
  };

  const handleOpenCreateModal = () => {
    setError('');
    setCreateError('');
    const defaultBranch = (selectedBranch && selectedBranch !== 'all')
      ? selectedBranch
      : (branches[0]?.id || branches[0]?._id || branches[0]?.code || '');
    setNewPoBranch(defaultBranch);
    setExpectedDate(new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]);
    setLineItems([{ ingredientId: '', orderedQty: '', unitPrice: '', unit: 'kg' }]);
    setIsCreateOpen(true);
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!newPoSupplier) {
      setCreateError('Please select a supplier');
      return;
    }
    const branchToUse = newPoBranch || (selectedBranch !== 'all' ? selectedBranch : (branches[0]?.id || branches[0]?._id || branches[0]?.code));
    if (!branchToUse || branchToUse === 'all') {
      setCreateError('Please select a specific receiving branch');
      return;
    }
    const validItems = lineItems.filter(i => i.ingredientId && Number(i.orderedQty) > 0);
    if (validItems.length === 0) {
      setCreateError('Please specify at least one valid line item with quantity');
      return;
    }

    try {
      await PurchaseOrderService.createPORemote({
        supplierId: newPoSupplier,
        branchId: branchToUse,
        expectedDate: expectedDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        items: validItems,
        notes: 'Enterprise PO',
        createdBy: 'Procurement Specialist'
      });
      setIsCreateOpen(false);
      setLineItems([{ ingredientId: '', orderedQty: '', unitPrice: '', unit: 'kg' }]);
      setCreateError('');
      setNotice('Purchase order created successfully.');
      await loadData(true);
    } catch (err) {
      setCreateError(err.message || 'PO creation failed');
    }
  };

  const handleDeletePO = async (po) => {
    if (!po || deleting) return;
    setDeleting(true);
    setError('');
    setNotice('');
    try {
      await PurchaseOrderService.deletePORemote(po.id || po._id || po.poNumber);
      setDeleteConfirmTarget(null);
      setNotice(`Purchase Order ${po.poNumber} deleted.`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete order');
    } finally {
      setDeleting(false);
    }
  };

  const supplierMap = {};
  if (Array.isArray(suppliers)) {
    suppliers.forEach(s => {
      if (s) {
        if (s.id) supplierMap[s.id] = s.name;
        if (s._id) supplierMap[String(s._id)] = s.name;
        if (s.code) supplierMap[s.code] = s.name;
      }
    });
  }

  const branchMap = {};
  if (Array.isArray(branches)) {
    branches.forEach(b => {
      if (b) {
        if (b.id) branchMap[b.id] = b.name;
        if (b._id) branchMap[String(b._id)] = b.name;
        if (b.code) {
          branchMap[b.code] = b.name;
          branchMap[b.code.toLowerCase()] = b.name;
          branchMap[b.code.toUpperCase()] = b.name;
        }
      }
    });
  }

  const formatBranch = (val) => {
    if (!val) return '—';
    const key = typeof val === 'object' && val !== null ? (val._id || val.id || val.name || val.code) : val;
    if (branchMap[key]) return branchMap[key];
    if (branchMap[String(key)]) return branchMap[String(key)];
    const found = branches.find(b => b.id === key || b._id === key || b.code === key || b.name === key);
    if (found) return found.name;
    if (typeof key === 'string' && key.startsWith('b_')) {
      const clean = key.slice(2).replace(/_/g, ' ');
      return clean.charAt(0).toUpperCase() + clean.slice(1) + ' Branch';
    }
    return String(key);
  };

  const ingredientMap = {};
  if (Array.isArray(ingredients)) {
    ingredients.forEach(i => {
      if (i) {
        if (i.id) ingredientMap[i.id] = i.name;
        if (i._id) ingredientMap[String(i._id)] = i.name;
      }
    });
  }

  const formatReportedBy = (val) => {
    if (!val || val === 'undefined') return 'Staff';
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
  }, [search, selectedBranch, statusFilter, supplierFilter]);

  // Helper to check branch match
  const branchMatches = (poBranch, target) => {
    if (!target || target === 'all') return true;
    if (!poBranch) return false;
    const poBId = typeof poBranch === 'object' ? (poBranch.id || poBranch._id || poBranch.code) : poBranch;
    const b = branches.find(item => item.id === target || item._id === target || item.code === target);
    const candidates = [target, b?.id, b?._id, b?.code].filter(Boolean).map(String);
    return candidates.includes(String(poBId));
  };

  // Filtered orders
  const filteredOrders = orders.filter((po) => {
    if (!po) return false;

    // Status filter
    if (statusFilter && statusFilter !== 'ALL' && po.status !== statusFilter) {
      return false;
    }

    // Supplier filter
    if (supplierFilter && supplierFilter !== 'ALL') {
      const sId = String(po.supplierId || (typeof po.supplier === 'object' ? (po.supplier?._id || po.supplier?.id) : po.supplier) || '');
      const filterId = String(supplierFilter);
      const sObj = suppliers.find(s => s.id === supplierFilter || s._id === supplierFilter || s.code === supplierFilter || s.name === supplierFilter);
      const supplierCandidates = [filterId, sObj?.id, sObj?._id, sObj?.code].filter(Boolean).map(String);
      if (!supplierCandidates.includes(sId) && po.supplierName !== supplierFilter) {
        return false;
      }
    }

    // Branch filter
    if (selectedBranch && selectedBranch !== 'all' && !branchMatches(po.branchId || po.branch, selectedBranch)) {
      return false;
    }

    // Search query
    if (search && search.trim() !== '') {
      const q = search.toLowerCase();
      const poNum = (po.poNumber || '').toLowerCase();
      const supId = String(po.supplierId || (typeof po.supplier === 'object' ? (po.supplier?._id || po.supplier?.id) : po.supplier) || '');
      const supName = (po.supplierName || supplierMap[supId] || supplierMap[po.supplierId] || '').toLowerCase();
      const bName = (formatBranch(po.branchId || po.branch) || '').toLowerCase();
      const hasItemMatch = Array.isArray(po.items) && po.items.some(it => {
        const ingName = (ingredientMap[it.ingredientId] || it.name || '').toLowerCase();
        return ingName.includes(q);
      });
      return poNum.includes(q) || supName.includes(q) || bName.includes(q) || hasItemMatch;
    }

    return true;
  });

  const totalItems = filteredOrders.length;
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const getStatusClass = (status) => {
    if (status === 'RECEIVED') return 'is-received';
    if (status === 'ORDERED') return 'is-ordered';
    if (status === 'APPROVED') return 'is-approved';
    if (status === 'SUBMITTED' || status === 'PARTIALLY_RECEIVED') return 'is-submitted';
    return 'is-draft';
  };

  return (
    <div className="employees-page">
      {/* Heading matching Images 1-4 */}
      <div className="employees-heading">
        <div>
          <p>Plan procurement, approve orders, and track goods receipts.</p>
        </div>

        <div className="employees-heading-actions">
          <button
            type="button"
            className="employees-button employees-button-primary"
            onClick={handleOpenCreateModal}
          >
            <Plus size={16} />
            Create purchase order
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
            placeholder="Search PO number or supplier..."
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
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted for Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="ORDERED">Ordered</option>
            <option value="PARTIALLY_RECEIVED">Partially Received</option>
            <option value="RECEIVED">Fully Received</option>
          </select>
        </label>

        <label className="employees-filter">
          <span>Supplier</span>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
          >
            <option value="ALL">All suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Table Card matching People & HR and Actions from Image 5 */}
      <div className="employees-table-card">
        <div className="employees-table-heading">
          <div>
            <h3>Purchase Orders</h3>
            <p>
              {filteredOrders.length} result{filteredOrders.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="employees-empty-state">
            <ShoppingBag size={26} />
            <h3>No purchase order records found</h3>
            <p>Try changing the filters or create a new purchase order.</p>
          </div>
        ) : (
          <div className="employees-table-scroll">
            <table className="employees-table">
              <thead>
                <tr>
                  <th style={{ whiteSpace: 'nowrap', minWidth: '130px' }}>PO Number</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Supplier</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Branch</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Order Date</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Expected Date</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Line Items</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Total Amount</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Reported By</th>
                  <th style={{ width: '220px', minWidth: '220px', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((po) => {
                  const supName = (typeof po.supplier === 'object' && po.supplier?.name)
                    ? po.supplier.name
                    : (po.supplierName || supplierMap[po.supplierId] || supplierMap[po.supplier] || (po.supplierId && po.supplierId !== 'Supplier' ? po.supplierId : '') || '—');
                  const bName = formatBranch(po.branchId || po.branch);
                  const expDate = po.expectedDate || po.expectedDeliveryDate;
                  const expDateStr = expDate
                    ? (typeof expDate === 'string' && expDate.includes('T') ? expDate.split('T')[0] : (typeof expDate === 'string' ? expDate : new Date(expDate).toISOString().split('T')[0]))
                    : '—';

                  return (
                    <tr key={po.id || po._id || po.poNumber}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <code>{po.poNumber}</code>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{supName}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{bName}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {po.createdAt ? (typeof po.createdAt === 'string' && po.createdAt.includes('T') ? po.createdAt.split('T')[0] : new Date(po.createdAt).toISOString().split('T')[0]) : '—'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{expDateStr}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <strong>{(po.items || []).length} item{(po.items || []).length !== 1 ? 's' : ''}</strong>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <strong>₹{(po.totalAmount || 0).toLocaleString()}</strong>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className={`employees-status ${getStatusClass(po.status)}`}>
                          {po.status}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatReportedBy(po.createdBy)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {/* Edit/View | Transition | Delete Action Group */}
                        <div className="employees-row-actions" style={{ display: 'inline-flex', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="employees-button employees-button-secondary"
                            onClick={() => setViewHistoryPO(po)}
                          >
                            <Pencil size={15} />
                            View
                          </button>

                          {po.status === 'DRAFT' && (
                            <button
                              type="button"
                              className="employees-button employees-button-secondary"
                              onClick={() => handleTransition(po.id || po._id || po.poNumber, 'SUBMITTED')}
                            >
                              Submit
                            </button>
                          )}

                          {po.status === 'SUBMITTED' && (
                            <button
                              type="button"
                              className="employees-button employees-button-secondary"
                              onClick={() => handleTransition(po.id || po._id || po.poNumber, 'APPROVED')}
                            >
                              Approve
                            </button>
                          )}

                          {po.status === 'APPROVED' && (
                            <button
                              type="button"
                              className="employees-button employees-button-secondary"
                              onClick={() => handleTransition(po.id || po._id || po.poNumber, 'ORDERED')}
                            >
                              Issue PO
                            </button>
                          )}

                          {(po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED') && (
                            <button
                              type="button"
                              className="employees-button employees-button-secondary"
                              onClick={() => handleOpenReceive(po)}
                            >
                              Receive
                            </button>
                          )}

                          {po.status === 'RECEIVED' && (
                            <button
                              type="button"
                              className="employees-button employees-button-secondary"
                              onClick={() => setViewHistoryPO(po)}
                            >
                              GRNs
                            </button>
                          )}

                          <button
                            type="button"
                            className="employees-button employees-button-danger"
                            onClick={() => setDeleteConfirmTarget(po)}
                            title={`Cancel PO ${po.poNumber}`}
                            aria-label={`Cancel PO ${po.poNumber}`}
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

      {/* CREATE PURCHASE ORDER MODAL */}
      {isCreateOpen && (
        <div
          className="employees-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsCreateOpen(false);
          }}
        >
          <div className="employees-modal" role="dialog" aria-modal="true" style={{ maxWidth: '750px' }}>
            <div className="employees-modal-heading">
              <div>
                <p className="employees-eyebrow">PROCUREMENT ORDER</p>
                <h3>Create Purchase Order</h3>
              </div>
              <button
                type="button"
                className="employees-modal-close"
                onClick={() => setIsCreateOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {createError && (
              <div className="employees-error" role="alert">
                <AlertCircle size={18} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePO}>
              <div className="employees-form-grid">
                <label>
                  Supplier *
                  <select
                    value={newPoSupplier}
                    onChange={(e) => setNewPoSupplier(e.target.value)}
                    required
                  >
                    <option value="">Select a supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </label>

                <label>
                  Receiving Branch *
                  <select
                    value={newPoBranch}
                    onChange={(e) => setNewPoBranch(e.target.value)}
                    required
                  >
                    <option value="">Select a branch</option>
                    {branches.map((b) => (
                      <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>
                    ))}
                  </select>
                </label>

                <label className="employees-field-full">
                  Expected Delivery Date
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                  />
                </label>
              </div>

              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#52645b' }}>Order Line Items</span>
                  <button
                    type="button"
                    className="employees-button employees-button-secondary"
                    onClick={handleAddLineItem}
                    style={{ minHeight: '30px', height: '30px', padding: '4px 8px' }}
                  >
                    <Plus size={14} />
                    Add Item
                  </button>
                </div>

                {lineItems.map((line, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
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
                      placeholder="Qty"
                      min="0.1"
                      step="any"
                      value={line.orderedQty}
                      onChange={(e) => handleLineChange(idx, 'orderedQty', e.target.value)}
                      required
                    />
                    <input
                      type="number"
                      placeholder="Unit Price (₹)"
                      min="0"
                      step="any"
                      value={line.unitPrice}
                      onChange={(e) => handleLineChange(idx, 'unitPrice', e.target.value)}
                      required
                    />
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        className="employees-button employees-button-danger"
                        onClick={() => handleRemoveLineItem(idx)}
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
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="employees-button employees-button-primary"
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GOODS RECEIVING NOTE (GRN) MODAL */}
      {receivingPO && (
        <div
          className="employees-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setReceivingPO(null);
          }}
        >
          <div className="employees-modal" role="dialog" aria-modal="true" style={{ maxWidth: '850px' }}>
            <div className="employees-modal-heading">
              <div>
                <p className="employees-eyebrow">GOODS RECEIPT NOTE</p>
                <h3>Receive Goods: {receivingPO.poNumber}</h3>
              </div>
              <button
                type="button"
                className="employees-modal-close"
                onClick={() => setReceivingPO(null)}
              >
                <X size={20} />
              </button>
            </div>

            {grnError && (
              <div className="employees-error" role="alert">
                <AlertCircle size={18} />
                <span>{grnError}</span>
              </div>
            )}

            <form onSubmit={handleProcessGRN}>
              <div className="employees-form-grid" style={{ marginBottom: '16px' }}>
                <label>
                  GRN Identifier
                  <input
                    type="text"
                    value={grnNumber}
                    onChange={(e) => setGrnNumber(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Notes / Dispatch Info
                  <input
                    type="text"
                    value={grnNotes}
                    onChange={(e) => setGrnNotes(e.target.value)}
                    placeholder="e.g. Delivery truck #KA-01-AB-1234"
                  />
                </label>
              </div>

              <div className="employees-table-scroll" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="employees-table">
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Ordered</th>
                      <th>Accepted</th>
                      <th>Rejected</th>
                      <th>Damaged</th>
                      <th>Batch Code</th>
                      <th>Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grnReceiptItems.map((item, idx) => (
                      <tr key={idx}>
                        <td><strong>{ingredientMap[item.ingredientId] || item.ingredientId}</strong></td>
                        <td>{item.orderedQty} {item.unit}</td>
                        <td>
                          <input
                            type="number"
                            style={{ width: '75px', height: '34px' }}
                            value={item.acceptedQty}
                            min="0"
                            step="any"
                            onChange={(e) => {
                              const updated = [...grnReceiptItems];
                              updated[idx].acceptedQty = e.target.value;
                              setGrnReceiptItems(updated);
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            style={{ width: '65px', height: '34px' }}
                            value={item.rejectedQty}
                            min="0"
                            onChange={(e) => {
                              const updated = [...grnReceiptItems];
                              updated[idx].rejectedQty = e.target.value;
                              setGrnReceiptItems(updated);
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            style={{ width: '65px', height: '34px' }}
                            value={item.damagedQty}
                            min="0"
                            onChange={(e) => {
                              const updated = [...grnReceiptItems];
                              updated[idx].damagedQty = e.target.value;
                              setGrnReceiptItems(updated);
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            style={{ width: '100px', height: '34px' }}
                            value={item.batchNumber}
                            onChange={(e) => {
                              const updated = [...grnReceiptItems];
                              updated[idx].batchNumber = e.target.value;
                              setGrnReceiptItems(updated);
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            style={{ width: '130px', height: '34px' }}
                            value={item.expiryDate}
                            onChange={(e) => {
                              const updated = [...grnReceiptItems];
                              updated[idx].expiryDate = e.target.value;
                              setGrnReceiptItems(updated);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="employees-form-actions">
                <button
                  type="button"
                  className="employees-button employees-button-secondary"
                  onClick={() => setReceivingPO(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="employees-button employees-button-primary"
                >
                  Confirm Goods Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS / GRN HISTORY MODAL */}
      {viewHistoryPO && (
        <div
          className="employees-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewHistoryPO(null);
          }}
        >
          <div className="employees-modal" role="dialog" aria-modal="true" style={{ maxWidth: '700px' }}>
            <div className="employees-modal-heading">
              <div>
                <p className="employees-eyebrow">ORDER DETAILS</p>
                <h3>{viewHistoryPO.poNumber}</h3>
              </div>
              <button
                type="button"
                className="employees-modal-close"
                onClick={() => setViewHistoryPO(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '16px', fontSize: '13px', color: '#52645a' }}>
              <p><strong>Supplier:</strong> {supplierMap[viewHistoryPO.supplierId] || viewHistoryPO.supplierId}</p>
              <p><strong>Branch:</strong> {branchMap[viewHistoryPO.branchId] || viewHistoryPO.branchId}</p>
              <p><strong>Status:</strong> {viewHistoryPO.status}</p>
              <p><strong>Total Amount:</strong> ₹{(viewHistoryPO.totalAmount || 0).toLocaleString()}</p>
            </div>

            <span style={{ fontSize: '12px', fontWeight: 700, color: '#52645b', display: 'block', marginBottom: '8px' }}>Line Items</span>
            <div className="employees-table-scroll" style={{ marginBottom: '20px' }}>
              <table className="employees-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Ordered</th>
                    <th>Received</th>
                    <th>Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewHistoryPO.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td><strong>{ingredientMap[it.ingredientId] || it.ingredientName || it.ingredientId}</strong></td>
                      <td>{it.orderedQty} {it.unit}</td>
                      <td>{it.receivedQty || 0} {it.unit}</td>
                      <td>₹{it.unitPrice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="employees-form-actions">
              <button
                type="button"
                className="employees-button employees-button-secondary"
                onClick={() => setViewHistoryPO(null)}
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
            aria-labelledby="delete-po-title"
            aria-describedby="delete-po-description"
          >
            <div className="employees-delete-icon">
              <Trash2 size={24} />
            </div>

            <h3 id="delete-po-title">Delete Purchase Order?</h3>

            <p id="delete-po-description">
              Are you sure you want to permanently delete PO <strong>{deleteConfirmTarget.poNumber}</strong>? This action cannot be undone.
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
                onClick={() => handleDeletePO(deleteConfirmTarget)}
                disabled={deleting}
              >
                <Trash2 size={16} />
                {deleting ? 'Deleting...' : 'Delete Purchase Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
