import { useState, useEffect } from 'react';
import { PurchaseOrderService } from '../services/purchaseOrderService';
import { SupplierService } from '../services/supplierService';
import { InventoryService } from '../services/inventoryService';
import StockBadge from '../components/StockBadge';
import '../../../styles/inventory-orders.css';

export default function PurchaseOrdersPage({ branchId, branches = [] }) {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [receivingPO, setReceivingPO] = useState(null);
  const [viewHistoryPO, setViewHistoryPO] = useState(null);

  // Create PO Form
  const [newPoBranch, setNewPoBranch] = useState(branchId === 'all' ? (branches[0]?.id || 'b_downtown') : branchId);
  const [newPoSupplier, setNewPoSupplier] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [lineItems, setLineItems] = useState([
    { ingredientId: '', orderedQty: '', unitPrice: '', unit: 'kg' }
  ]);
  const [createError, setCreateError] = useState('');

  // Goods Receiving Note (GRN) Form
  const [grnNumber, setGrnNumber] = useState('');
  const [receiverName, setReceiverName] = useState('Arjun Verma');
  const [grnItems, setGrnItems] = useState([]);
  const [grnNotes, setGrnNotes] = useState('');
  const [grnError, setGrnError] = useState('');

  const [isSyncing, setIsSyncing] = useState(false);

  const loadData = async () => {
    const list = PurchaseOrderService.getPurchaseOrders({
      branchId,
      status: statusFilter,
      supplierId: supplierFilter
    });
    setOrders(list);
    setSuppliers(SupplierService.getSuppliers());
    setIngredients(InventoryService.getIngredients());

    setIsSyncing(true);
    try {
      await Promise.all([
        PurchaseOrderService.syncFromBackend(branchId),
        SupplierService.syncFromBackend(),
        InventoryService.syncFromBackend(branchId)
      ]);
      const fresh = PurchaseOrderService.getPurchaseOrders({
        branchId,
        status: statusFilter,
        supplierId: supplierFilter
      });
      setOrders(fresh);
      setSuppliers(SupplierService.getSuppliers());
      setIngredients(InventoryService.getIngredients());
    } catch (err) {
      console.warn('PurchaseOrders sync error:', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [branchId, statusFilter, supplierFilter]);

  // Handle PO Lifecycle Progression
  const handleTransition = async (poId, nextStatus) => {
    try {
      await PurchaseOrderService.updateStatusRemote(poId, nextStatus, 'Arjun Verma (Director)');
      loadData();
    } catch (err) {
      alert(err.message || 'Status transition error');
    }
  };

  // Open Goods Receiving Modal
  const handleOpenReceive = (po) => {
    setReceivingPO(po);
    setGrnNumber(`GRN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setGrnError('');
    setGrnNotes('');
    // Initialise receipt rows
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
        batchNumber: `BAT-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(10 + Math.random() * 90)}`,
        expiryDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
      };
    });
    setGrnItems(items);
  };

  const handleProcessGRN = async (e) => {
    e.preventDefault();
    if (!receivingPO) return;

    try {
      await PurchaseOrderService.receiveGoodsRemote({
        poId: receivingPO.id,
        grnNumber,
        receiverName,
        receiptItems: grnItems,
        notes: grnNotes
      });
      await InventoryService.syncFromBackend(branchId);

      setReceivingPO(null);
      loadData();
    } catch (err) {
      setGrnError(err.message || 'Error processing goods receipt note');
    }
  };

  // Line item helpers for Create PO
  const addLineItem = () => {
    setLineItems([...lineItems, { ingredientId: '', orderedQty: '', unitPrice: '', unit: 'kg' }]);
  };

  const removeLineItem = (index) => {
    setLineItems(lineItems.filter((_, idx) => idx !== index));
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
    if (!newPoSupplier || lineItems.length === 0 || lineItems.some(i => !i.ingredientId || !i.orderedQty)) {
      setCreateError('Please select a supplier and provide valid line items with quantities');
      return;
    }

    try {
      await PurchaseOrderService.createPORemote({
        supplierId: newPoSupplier,
        branchId: newPoBranch,
        expectedDate: expectedDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        items: lineItems
      });

      setIsCreateOpen(false);
      setLineItems([{ ingredientId: '', orderedQty: '', unitPrice: '', unit: 'kg' }]);
      setNewPoSupplier('');
      setCreateError('');
      loadData();
    } catch (err) {
      setCreateError(err.message || 'Error creating PO');
    }
  };

  const supplierMap = {};
  suppliers.forEach(s => { supplierMap[s.id] = s.name; });

  const branchMap = {};
  branches.forEach(b => { branchMap[b.id] = b.name; });

  const ingredientMap = {};
  ingredients.forEach(i => { ingredientMap[i.id] = i.name; });

  return (
    <div className="inv-orders-page">
      {/* Toolbar */}
      <div className="inv-toolbar">
        <div className="inv-filter-group">
          <select
            className="inv-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter POs by lifecycle status"
          >
            <option value="ALL">All Order Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted (Pending Approval)</option>
            <option value="APPROVED">Approved</option>
            <option value="ORDERED">Ordered (Awaiting Delivery)</option>
            <option value="PARTIALLY_RECEIVED">Partially Received</option>
            <option value="RECEIVED">Fully Received</option>
          </select>

          <select
            className="inv-select"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            aria-label="Filter POs by vendor"
          >
            <option value="ALL">All Suppliers</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="inv-btn inv-btn-primary"
          onClick={() => setIsCreateOpen(true)}
        >
          + Create Purchase Order
        </button>
      </div>

      {/* PO List Table */}
      <div className="inv-card">
        <div className="inv-card-header">
          <div>
            <h3>Purchase Orders & Goods Receiving Lifecycle</h3>
            <p>Full audit trail: Draft → Approval → Order → GRN Verification</p>
          </div>
        </div>
        <div className="inv-card-body" style={{ padding: 0 }}>
          <div className="inv-table-wrapper">
            <table className="inv-table">
              <thead>
                <tr>
                  <th style={{ width: '140px', whiteSpace: 'nowrap' }}>PO #</th>
                  <th>Supplier</th>
                  <th>Receiving Branch</th>
                  <th style={{ width: '110px', whiteSpace: 'nowrap' }}>Order Date</th>
                  <th style={{ width: '110px', whiteSpace: 'nowrap' }}>Expected</th>
                  <th>Line Items</th>
                  <th>Total Amount</th>
                  <th>Lifecycle Status</th>
                  <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                      No purchase orders found matching this filter.
                    </td>
                  </tr>
                ) : (
                  orders.map(po => {
                    const supName = supplierMap[po.supplierId] || po.supplierId;
                    const bName = branchMap[po.branchId] || po.branchId;

                    return (
                      <tr key={po.id}>
                        <td className="inv-cell-code"><code>{po.poNumber}</code></td>
                        <td>
                          <strong>{supName}</strong>
                        </td>
                        <td className="inv-cell-nowrap">{bName}</td>
                        <td className="inv-cell-date">
                          {po.createdAt ? (typeof po.createdAt === 'string' && po.createdAt.includes('T') ? po.createdAt.split('T')[0] : new Date(po.createdAt).toISOString().split('T')[0]) : '—'}
                        </td>
                        <td className="inv-cell-date">
                          {po.expectedDate ? (typeof po.expectedDate === 'string' && po.expectedDate.includes('T') ? po.expectedDate.split('T')[0] : String(po.expectedDate)) : '—'}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{(po.items || []).length} item{(po.items || []).length !== 1 ? 's' : ''}</span>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', maxWidth: '220px', whiteSpace: 'normal' }}>
                            {(po.items || []).map(i => ingredientMap[i.ingredientId] || i.ingredientName || i.ingredientId).slice(0, 2).join(', ')}
                            {(po.items || []).length > 2 ? '...' : ''}
                          </span>
                        </td>
                        <td className="inv-cell-amount"><strong>₹{(po.totalAmount || 0).toLocaleString()}</strong></td>
                        <td className="inv-cell-badge"><StockBadge status={po.status} /></td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {po.status === 'DRAFT' && (
                              <button
                                type="button"
                                className="inv-btn inv-btn-sm inv-btn-secondary"
                                onClick={() => handleTransition(po.id || po._id || po.poNumber, 'SUBMITTED')}
                              >
                                Submit
                              </button>
                            )}

                            {po.status === 'SUBMITTED' && (
                              <button
                                type="button"
                                className="inv-btn inv-btn-sm inv-btn-gold"
                                onClick={() => handleTransition(po.id || po._id || po.poNumber, 'APPROVED')}
                              >
                                Approve
                              </button>
                            )}

                            {po.status === 'APPROVED' && (
                              <button
                                type="button"
                                className="inv-btn inv-btn-sm inv-btn-primary"
                                onClick={() => handleTransition(po.id || po._id || po.poNumber, 'ORDERED')}
                              >
                                Issue PO
                              </button>
                            )}

                            {(po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED') && (
                              <button
                                type="button"
                                className="inv-btn inv-btn-sm inv-btn-gold"
                                onClick={() => handleOpenReceive(po)}
                              >
                                Receive GRN
                              </button>
                            )}

                            {po.receiptHistory && po.receiptHistory.length > 0 && (
                              <button
                                type="button"
                                className="inv-btn inv-btn-sm inv-btn-secondary"
                                onClick={() => setViewHistoryPO(po)}
                              >
                                GRNs ({po.receiptHistory.length})
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* GOODS RECEIVING NOTE (GRN) MODAL */}
      {receivingPO && (
        <div className="inv-modal-overlay">
          <div className="inv-modal-content" style={{ maxWidth: '850px' }}>
            <div className="inv-modal-header">
              <div>
                <h3>Receive Goods: Goods Receiving Note (GRN)</h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  Purchase Order: <strong>{receivingPO.poNumber}</strong> • Supplier: {supplierMap[receivingPO.supplierId]}
                </p>
              </div>
              <button type="button" className="inv-modal-close" onClick={() => setReceivingPO(null)}>✕</button>
            </div>

            <form onSubmit={handleProcessGRN}>
              <div className="inv-modal-body">
                {grnError && <div className="inv-alert-banner inv-alert-danger">{grnError}</div>}

                <div className="inv-alert-banner inv-alert-warning" style={{ fontSize: '12px' }}>
                  ℹ️ <strong>Stock Integrity Rule:</strong> Only Accepted Quantity increases live inventory. Damaged or rejected quantities are excluded from stock and tracked for vendor credit.
                </div>

                <div className="inv-form-row">
                  <div className="inv-form-group">
                    <label>GRN Reference Number *</label>
                    <input
                      type="text"
                      className="inv-form-control"
                      value={grnNumber}
                      onChange={(e) => setGrnNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="inv-form-group">
                    <label>Receiving Officer Name *</label>
                    <input
                      type="text"
                      className="inv-form-control"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Line Items Receiving Table */}
                <div style={{ marginTop: '12px', marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text)' }}>
                    RECEIPT LINE ITEMS VERIFICATION
                  </label>
                  <table className="inv-table" style={{ marginTop: '8px' }}>
                    <thead>
                      <tr>
                        <th>Ingredient</th>
                        <th>Ordered</th>
                        <th style={{ width: '100px' }}>Accepted *</th>
                        <th style={{ width: '90px' }}>Rejected</th>
                        <th style={{ width: '90px' }}>Damaged</th>
                        <th>Batch Code *</th>
                        <th>Expiry Date *</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grnItems.map((item, idx) => {
                        const ingName = ingredientMap[item.ingredientId] || item.ingredientId;
                        return (
                          <tr key={item.ingredientId}>
                            <td><strong>{ingName}</strong></td>
                            <td>{item.orderedQty} {item.unit}</td>
                            <td>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                className="inv-form-control"
                                value={item.acceptedQty}
                                onChange={(e) => {
                                  const updated = [...grnItems];
                                  updated[idx].acceptedQty = e.target.value;
                                  setGrnItems(updated);
                                }}
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                className="inv-form-control"
                                value={item.rejectedQty}
                                onChange={(e) => {
                                  const updated = [...grnItems];
                                  updated[idx].rejectedQty = e.target.value;
                                  setGrnItems(updated);
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                className="inv-form-control"
                                value={item.damagedQty}
                                onChange={(e) => {
                                  const updated = [...grnItems];
                                  updated[idx].damagedQty = e.target.value;
                                  setGrnItems(updated);
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="inv-form-control"
                                value={item.batchNumber}
                                onChange={(e) => {
                                  const updated = [...grnItems];
                                  updated[idx].batchNumber = e.target.value;
                                  setGrnItems(updated);
                                }}
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="date"
                                className="inv-form-control"
                                value={item.expiryDate}
                                onChange={(e) => {
                                  const updated = [...grnItems];
                                  updated[idx].expiryDate = e.target.value;
                                  setGrnItems(updated);
                                }}
                                required
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="inv-form-group">
                  <label>Receiving Quality Notes & Observations</label>
                  <textarea
                    className="inv-form-control"
                    rows="2"
                    placeholder="Temperature on arrival, packaging integrity, seal notes..."
                    value={grnNotes}
                    onChange={(e) => setGrnNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="inv-modal-footer">
                <button type="button" className="inv-btn inv-btn-secondary" onClick={() => setReceivingPO(null)}>
                  Cancel
                </button>
                <button type="submit" className="inv-btn inv-btn-primary">
                  Confirm Receipt & Commit Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PURCHASE ORDER MODAL */}
      {isCreateOpen && (
        <div className="inv-modal-overlay">
          <div className="inv-modal-content" style={{ maxWidth: '850px' }}>
            <div className="inv-modal-header">
              <h3>Create Purchase Order (PO)</h3>
              <button type="button" className="inv-modal-close" onClick={() => setIsCreateOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreatePO}>
              <div className="inv-modal-body">
                {createError && <div className="inv-alert-banner inv-alert-danger">{createError}</div>}

                <div className="inv-form-row">
                  <div className="inv-form-group">
                    <label>Select Supplier *</label>
                    <select
                      className="inv-form-control"
                      value={newPoSupplier}
                      onChange={(e) => setNewPoSupplier(e.target.value)}
                      required
                    >
                      <option value="">Select Vendor...</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                      ))}
                    </select>
                  </div>

                  <div className="inv-form-group">
                    <label>Receiving Branch *</label>
                    <select
                      className="inv-form-control"
                      value={newPoBranch}
                      onChange={(e) => setNewPoBranch(e.target.value)}
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="inv-form-group">
                  <label>Expected Delivery Date</label>
                  <input
                    type="date"
                    className="inv-form-control"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                  />
                </div>

                {/* Line Items */}
                <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700 }}>ORDER LINE ITEMS</label>
                    <button type="button" className="inv-btn inv-btn-sm inv-btn-secondary" onClick={addLineItem}>
                      + Add Item
                    </button>
                  </div>

                  {lineItems.map((line, idx) => (
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
                          <option key={ing.id} value={ing.id}>{ing.name} ({ing.sku})</option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="any"
                        min="1"
                        className="inv-form-control"
                        placeholder="Quantity"
                        style={{ flex: 1.5 }}
                        value={line.orderedQty}
                        onChange={(e) => handleLineChange(idx, 'orderedQty', e.target.value)}
                        required
                      />

                      <span style={{ fontSize: '12px', width: '40px', color: 'var(--color-text-muted)' }}>
                        {line.unit}
                      </span>

                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="inv-form-control"
                        placeholder="Price ₹"
                        style={{ flex: 1.5 }}
                        value={line.unitPrice}
                        onChange={(e) => handleLineChange(idx, 'unitPrice', e.target.value)}
                        required
                      />

                      <span style={{ fontSize: '13px', fontWeight: 600, width: '100px', textAlign: 'right' }}>
                        ₹{Math.round((Number(line.orderedQty) || 0) * (Number(line.unitPrice) || 0))}
                      </span>

                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          className="inv-btn inv-btn-sm inv-btn-danger"
                          onClick={() => removeLineItem(idx)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="inv-modal-footer">
                <button type="button" className="inv-btn inv-btn-secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="inv-btn inv-btn-primary">
                  Create Draft Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW RECEIPT HISTORY DRAWER */}
      {viewHistoryPO && (
        <div className="inv-modal-overlay">
          <div className="inv-modal-content">
            <div className="inv-modal-header">
              <div>
                <h3>Goods Receipts (GRN History)</h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{viewHistoryPO.poNumber}</p>
              </div>
              <button type="button" className="inv-modal-close" onClick={() => setViewHistoryPO(null)}>✕</button>
            </div>
            <div className="inv-modal-body">
              {viewHistoryPO.receiptHistory.map((grn, i) => (
                <div key={i} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong>{grn.grnNumber}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{grn.receivedAt.replace('T', ' ').slice(0, 16)}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                    Received by: <strong>{grn.receivedBy}</strong>
                  </div>
                  {grn.notes && <div style={{ fontSize: '12px', fontStyle: 'italic', marginBottom: '8px' }}>"{grn.notes}"</div>}
                  {grn.rejectionReason && (
                    <div style={{ color: 'var(--color-error)', fontSize: '12px', marginBottom: '8px' }}>
                      Rejection Reason: {grn.rejectionReason}
                    </div>
                  )}
                  <table className="inv-table" style={{ fontSize: '11px' }}>
                    <thead>
                      <tr>
                        <th>Batch Code</th>
                        <th>Accepted</th>
                        <th>Rejected</th>
                        <th>Damaged</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grn.items ? grn.items.map((it, idx) => (
                        <tr key={idx}>
                          <td><code>{it.batchNumber}</code></td>
                          <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>{it.acceptedQty}</td>
                          <td>{it.rejectedQty}</td>
                          <td>{it.damagedQty}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td><code>{grn.batchNumber}</code></td>
                          <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>{grn.acceptedQty}</td>
                          <td>{grn.rejectedQty}</td>
                          <td>{grn.damagedQty}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
            <div className="inv-modal-footer">
              <button type="button" className="inv-btn inv-btn-secondary" onClick={() => setViewHistoryPO(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
