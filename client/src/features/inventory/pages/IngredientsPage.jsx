import { useState, useEffect } from 'react';
import { InventoryService } from '../services/inventoryService';
import { SupplierService } from '../services/supplierService';
import StockBadge from '../components/StockBadge';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import BatchTrackerModal from '../components/BatchTrackerModal';

export default function IngredientsPage({ branchId, branches = [] }) {
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [batchTarget, setBatchTarget] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Ingredient form
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: 'Produce & Greens',
    baseUnit: 'kg',
    unitCost: '',
    minThreshold: '',
    maxThreshold: '',
    reorderLevel: '',
    primarySupplierId: ''
  });
  const [formError, setFormError] = useState('');

  const [isSyncing, setIsSyncing] = useState(false);

  const loadData = async () => {
    const ings = InventoryService.getIngredients({
      branchId,
      category: categoryFilter,
      search,
      stockStatus: statusFilter
    });
    setIngredients(ings);
    setCategories(InventoryService.getCategories());
    setSuppliers(SupplierService.getSuppliers());

    setIsSyncing(true);
    try {
      await Promise.all([
        InventoryService.syncFromBackend(branchId),
        SupplierService.syncFromBackend()
      ]);
      const freshIngs = InventoryService.getIngredients({
        branchId,
        category: categoryFilter,
        search,
        stockStatus: statusFilter
      });
      setIngredients(freshIngs);
      setSuppliers(SupplierService.getSuppliers());
    } catch (err) {
      console.warn('Ingredients sync error:', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [branchId, categoryFilter, search, statusFilter]);

  const handleCreateIngredient = async (e) => {
    e.preventDefault();
    if (!form.name || !form.unitCost || !form.minThreshold) {
      setFormError('Please fill in all mandatory fields');
      return;
    }

    try {
      await InventoryService.saveIngredientRemote({
        name: form.name,
        sku: form.sku,
        category: form.category,
        baseUnit: form.baseUnit,
        unitCost: Number(form.unitCost),
        minThreshold: Number(form.minThreshold),
        maxThreshold: Number(form.maxThreshold || form.minThreshold * 3),
        reorderLevel: Number(form.reorderLevel || form.minThreshold * 1.3),
        primarySupplierId: form.primarySupplierId || (suppliers[0]?.id || '')
      });

      setIsAddModalOpen(false);
      setForm({
        name: '',
        sku: '',
        category: 'Produce & Greens',
        baseUnit: 'kg',
        unitCost: '',
        minThreshold: '',
        maxThreshold: '',
        reorderLevel: '',
        primarySupplierId: ''
      });
      loadData();
    } catch (err) {
      setFormError(err.message || 'Error saving ingredient');
    }
  };

  const getBranchStock = (ing) => {
    if (branchId === 'all') {
      return Object.values(ing.stockByBranch || {}).reduce((s, v) => s + (Number(v) || 0), 0);
    }
    return Number(ing.stockByBranch?.[branchId] || 0);
  };

  return (
    <div className="inv-ingredients-page">
      {/* Action Toolbar */}
      <div className="inv-toolbar">
        <div className="inv-search-box">
          <span aria-hidden="true" style={{ opacity: 0.6, fontSize: '15px' }}>⌕</span>
          <input
            type="text"
            placeholder="Search ingredient name, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="inv-filter-group">
          <select
            className="inv-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="inv-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by stock status"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="IN_STOCK">Adequate Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="CRITICAL">Critically Low</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>

          <button
            type="button"
            className="inv-btn inv-btn-primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            + Add New Ingredient
          </button>
        </div>
      </div>

      {/* Main Ingredient Table */}
      <div className="inv-card">
        <div className="inv-card-header">
          <div>
            <h3>Ingredient Catalog & Stock Levels</h3>
            <p>
              Showing {ingredients.length} items • Location: {branchId === 'all' ? 'All Branches (Enterprise)' : branchId}
            </p>
          </div>
        </div>
        <div className="inv-card-body" style={{ padding: 0 }}>
          <div className="inv-table-wrapper">
            <table className="inv-table">
              <thead>
                <tr>
                  <th style={{ width: '130px', whiteSpace: 'nowrap' }}>SKU</th>
                  <th>Ingredient Name</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Min / Reorder</th>
                  <th>Unit Cost</th>
                  <th>Total Value</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                      No ingredients found matching your search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  ingredients.map((ing) => {
                    const qty = getBranchStock(ing);
                    const status = InventoryService.calculateStockStatus(ing, branchId);
                    const totalVal = Math.round(qty * (Number(ing.unitCost) || 0));

                    return (
                      <tr key={ing.id}>
                        <td className="inv-cell-code"><code>{ing.sku}</code></td>
                        <td>
                          <strong>{ing.name}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            Base Unit: {ing.baseUnit}
                          </div>
                        </td>
                        <td className="inv-cell-nowrap">{ing.category}</td>
                        <td className="inv-cell-nowrap">
                          <strong style={{ fontSize: '14px', color: qty <= 0 ? 'var(--color-error)' : 'inherit' }}>
                            {qty} {ing.baseUnit}
                          </strong>
                        </td>
                        <td className="inv-cell-nowrap">
                          <span>{ing.minThreshold} {ing.baseUnit}</span>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}> / {ing.reorderLevel || '-'}</span>
                        </td>
                        <td className="inv-cell-amount">₹{ing.unitCost}</td>
                        <td className="inv-cell-amount"><strong>₹{totalVal.toLocaleString()}</strong></td>
                        <td className="inv-cell-badge"><StockBadge status={status} /></td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="inv-btn inv-btn-sm inv-btn-secondary"
                              title="Inspect Batch Expiry Details"
                              onClick={() => setBatchTarget(ing)}
                            >
                              Batches
                            </button>
                            <button
                              type="button"
                              className="inv-btn inv-btn-sm inv-btn-gold"
                              title="Adjust Physical Count"
                              onClick={() => setAdjustTarget(ing)}
                            >
                              Adjust
                            </button>
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

      {/* Stock Adjustment Modal */}
      {adjustTarget && (
        <StockAdjustmentModal
          isOpen={!!adjustTarget}
          ingredient={adjustTarget}
          branchId={branchId}
          branches={branches}
          onClose={() => setAdjustTarget(null)}
          onAdjusted={loadData}
        />
      )}

      {/* Batch Ledger Modal */}
      {batchTarget && (
        <BatchTrackerModal
          isOpen={!!batchTarget}
          ingredient={batchTarget}
          branches={branches}
          onClose={() => setBatchTarget(null)}
        />
      )}

      {/* Add New Ingredient Modal */}
      {isAddModalOpen && (
        <div className="inv-modal-overlay">
          <div className="inv-modal-content">
            <div className="inv-modal-header">
              <h3>Register New Ingredient</h3>
              <button type="button" className="inv-modal-close" onClick={() => setIsAddModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateIngredient}>
              <div className="inv-modal-body">
                {formError && <div className="inv-alert-banner inv-alert-danger">{formError}</div>}

                <div className="inv-form-row">
                  <div className="inv-form-group">
                    <label>Ingredient Name *</label>
                    <input
                      type="text"
                      className="inv-form-control"
                      placeholder="e.g. Fresh Sweet Basil"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="inv-form-group">
                    <label>SKU (Auto or Custom)</label>
                    <input
                      type="text"
                      className="inv-form-control"
                      placeholder="e.g. ING-HRB-009"
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    />
                  </div>
                </div>

                <div className="inv-form-row">
                  <div className="inv-form-group">
                    <label>Category *</label>
                    <select
                      className="inv-form-control"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="inv-form-group">
                    <label>Base Measurement Unit *</label>
                    <select
                      className="inv-form-control"
                      value={form.baseUnit}
                      onChange={(e) => setForm({ ...form, baseUnit: e.target.value })}
                    >
                      <option value="kg">Kilograms (kg)</option>
                      <option value="g">Grams (g)</option>
                      <option value="L">Liters (L)</option>
                      <option value="ml">Milliliters (ml)</option>
                      <option value="pcs">Pieces (pcs)</option>
                      <option value="can">Can / Tin</option>
                      <option value="box">Box</option>
                    </select>
                  </div>
                </div>

                <div className="inv-form-row">
                  <div className="inv-form-group">
                    <label>Standard Unit Cost (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="inv-form-control"
                      placeholder="450"
                      value={form.unitCost}
                      onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
                      required
                    />
                  </div>
                  <div className="inv-form-group">
                    <label>Primary Supplier</label>
                    <select
                      className="inv-form-control"
                      value={form.primarySupplierId}
                      onChange={(e) => setForm({ ...form, primarySupplierId: e.target.value })}
                    >
                      <option value="">Select Preferred Supplier...</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="inv-form-row">
                  <div className="inv-form-group">
                    <label>Minimum Stock Threshold *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="inv-form-control"
                      placeholder="10"
                      value={form.minThreshold}
                      onChange={(e) => setForm({ ...form, minThreshold: e.target.value })}
                      required
                    />
                  </div>
                  <div className="inv-form-group">
                    <label>Reorder Point Trigger</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="inv-form-control"
                      placeholder="15"
                      value={form.reorderLevel}
                      onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="inv-modal-footer">
                <button type="button" className="inv-btn inv-btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="inv-btn inv-btn-primary">
                  Save Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
