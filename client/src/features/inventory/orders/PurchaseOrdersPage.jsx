import { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  ShoppingBag,
  FileText
} from 'lucide-react';
import { PurchaseOrderService } from '../services/purchaseOrderService';
import { SupplierService } from '../services/supplierService';
import { InventoryService } from '../services/inventoryService';

export default function PurchaseOrdersPage({ branchId, branches = [] }) {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [ingredients, setIngredients] = useState([]);

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
    const list = PurchaseOrderService.getPurchaseOrders({
      branchId: selectedBranch,
      status: statusFilter,
      supplierId: supplierFilter
    });
    setOrders(list);
    setSuppliers(SupplierService.getSuppliers());
    setIngredients(InventoryService.getIngredients());

    setIsSyncing(true);
    try {
      await Promise.all([
        PurchaseOrderService.syncFromBackend(selectedBranch),
        SupplierService.syncFromBackend(),
        InventoryService.syncFromBackend(selectedBranch)
      ]);
      const fresh = PurchaseOrderService.getPurchaseOrders({
        branchId: selectedBranch,
        status: statusFilter,
        supplierId: supplierFilter
      });
      setOrders(fresh);
      setSuppliers(SupplierService.getSuppliers());
      setIngredients(InventoryService.getIngredients());
      if (refresh) setNotice('Purchase orders refreshed.');
    } catch (err) {
      console.warn('PurchaseOrders sync error:', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranch, statusFilter, supplierFilter]);

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

  const handleCreatePO = async (e) => {
    e.preventDefault();
    if (!newPoSupplier) {
      setCreateError('Please select a supplier');
      return;
    }
    if (!lineItems.some(i => i.ingredientId && Number(i.orderedQty) > 0)) {
      setCreateError('Please specify at least one valid line item with quantity');
      return;
    }

    try {
      await PurchaseOrderService.createPORemote({
        supplierId: newPoSupplier,
        branchId: newPoBranch || (branches[0]?.id || branches[0]?._id),
        expectedDate: expectedDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        items: lineItems.filter(i => i.ingredientId && Number(i.orderedQty) > 0),
        notes: 'Enterprise PO',
        createdBy: 'Procurement Specialist'
      });
      setIsCreateOpen(false);
      setLineItems([{ ingredientId: '', orderedQty: '', unitPrice: '', unit: 'kg' }]);
      setCreateError('');
      setNotice('Purchase order created successfully.');
      loadData();
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
  suppliers.forEach(s => { supplierMap[s.id] = s.name; });

  const branchMap = {};
  branches.forEach(b => { branchMap[b.id || b._id] = b.name; });

  const ingredientMap = {};
  ingredients.forEach(i => { ingredientMap[i.id] = i.name; });

  // Filtered orders
  const filteredOrders = orders.filter((po) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const poNum = (po.poNumber || '').toLowerCase();
    const supName = (supplierMap[po.supplierId] || '').toLowerCase();
    return poNum.includes(q) || supName.includes(q);
  });

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
          <h2>Purchase Orders</h2>
          <p>Plan procurement, approve orders, and track goods receipts.</p>
        </div>

        <div className="employees-heading-actions">
          <button
            type="button"
            className="employees-button employees-button-primary"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={16} />
            + Create purchase order
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
              <option key={s.id} value={s.id}>{s.name}</option>
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
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Branch</th>
                  <th>Order Date</th>
                  <th>Expected</th>
                  <th>Line Items</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th style={{ width: '230px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((po) => {
                  const supName = supplierMap[po.supplierId] || po.supplierId || 'Supplier';
                  const bName = branchMap[po.branchId] || po.branchId || 'Branch';

                  return (
                    <tr key={po.id || po._id || po.poNumber}>
                      <td>
                        <div className="employees-person">
                          <span className="employees-avatar" style={{ fontSize: '11px' }}>
                            <FileText size={16} />
                          </span>
                          <div className="employees-person-details">
                            <strong>{po.poNumber}</strong>
                            <span>{po.createdBy || 'Staff'}</span>
                          </div>
                        </div>
                      </td>
                      <td>{supName}</td>
                      <td>{bName}</td>
                      <td>
                        {po.createdAt ? (typeof po.createdAt === 'string' && po.createdAt.includes('T') ? po.createdAt.split('T')[0] : new Date(po.createdAt).toISOString().split('T')[0]) : '—'}
                      </td>
                      <td>
                        {po.expectedDate ? (typeof po.expectedDate === 'string' && po.expectedDate.includes('T') ? po.expectedDate.split('T')[0] : String(po.expectedDate)) : '—'}
                      </td>
                      <td>
                        <strong>{(po.items || []).length} item{(po.items || []).length !== 1 ? 's' : ''}</strong>
                      </td>
                      <td>
                        <strong>₹{(po.totalAmount || 0).toLocaleString()}</strong>
                      </td>
                      <td>
                        <span className={`employees-status ${getStatusClass(po.status)}`}>
                          {po.status}
                        </span>
                      </td>
                      <td>
                        {/* Image 5: Edit/View | Transition | Delete Action Group */}
                        <div className="employees-row-actions">
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
                    + Add Item
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
