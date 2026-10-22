import { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  Package
} from 'lucide-react';
import { InventoryService } from '../services/inventoryService';
import { SupplierService } from '../services/supplierService';
import StockAdjustmentModal from './StockAdjustmentModal';
import BatchTrackerModal from './BatchTrackerModal';

export default function IngredientsPage({ branchId, branches = [] }) {
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedBranch, setSelectedBranch] = useState(branchId || 'all');

  // Modals state
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [batchTarget, setBatchTarget] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Form State
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
  const [notice, setNotice] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setSelectedBranch(branchId);
  }, [branchId]);

  const loadData = async (refresh = false) => {
    const ings = InventoryService.getIngredients({
      branchId: selectedBranch,
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
        InventoryService.syncFromBackend(selectedBranch),
        SupplierService.syncFromBackend()
      ]);
      const freshIngs = InventoryService.getIngredients({
        branchId: selectedBranch,
        category: categoryFilter,
        search,
        stockStatus: statusFilter
      });
      setIngredients(freshIngs);
      setSuppliers(SupplierService.getSuppliers());
      if (refresh) setNotice('Ingredient catalog refreshed.');
    } catch (err) {
      console.warn('Ingredients sync error:', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranch, categoryFilter, search, statusFilter]);

  const openAddModal = () => {
    setEditingIngredient(null);
    setForm({
      name: '',
      sku: '',
      category: categories[0] || 'Produce & Greens',
      baseUnit: 'kg',
      unitCost: '',
      minThreshold: '',
      maxThreshold: '',
      reorderLevel: '',
      primarySupplierId: suppliers[0]?.id || ''
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditModal = (ing) => {
    setEditingIngredient(ing);
    setForm({
      name: ing.name || '',
      sku: ing.sku || '',
      category: ing.category || categories[0] || 'Produce & Greens',
      baseUnit: ing.baseUnit || 'kg',
      unitCost: ing.unitCost !== undefined ? String(ing.unitCost) : '',
      minThreshold: ing.minThreshold !== undefined ? String(ing.minThreshold) : '',
      maxThreshold: ing.maxThreshold !== undefined ? String(ing.maxThreshold) : '',
      reorderLevel: ing.reorderLevel !== undefined ? String(ing.reorderLevel) : '',
      primarySupplierId: ing.primarySupplierId || ''
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingIngredient(null);
    setFormError('');
  };

  const handleSaveIngredient = async (e) => {
    e.preventDefault();
    if (!form.name || form.unitCost === '' || form.minThreshold === '') {
      setFormError('Please fill in all mandatory fields');
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category,
        baseUnit: form.baseUnit,
        unitCost: Number(form.unitCost),
        minThreshold: Number(form.minThreshold),
        maxThreshold: Number(form.maxThreshold || Number(form.minThreshold) * 3),
        reorderLevel: Number(form.reorderLevel || Number(form.minThreshold) * 1.3),
        primarySupplierId: form.primarySupplierId || undefined
      };

      if (editingIngredient) {
        payload.id = editingIngredient.id;
        payload._id = editingIngredient._id || editingIngredient.id;
        payload.stockByBranch = editingIngredient.stockByBranch;
        payload.batches = editingIngredient.batches;
      }

      await InventoryService.saveIngredientRemote(payload);
      closeFormModal();
      setNotice(editingIngredient ? 'Ingredient updated successfully.' : 'Ingredient added successfully.');
      loadData();
    } catch (err) {
      setFormError(err.message || 'Error saving ingredient');
    }
  };

  const handleDeleteIngredient = async (ing) => {
    if (!ing || deleting) return;
    setDeleting(true);
    setError('');
    setNotice('');
    try {
      await InventoryService.deleteIngredientRemote(ing.id || ing._id);
      setDeleteConfirmTarget(null);
      setNotice(`Ingredient "${ing.name}" deleted successfully.`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete ingredient');
    } finally {
      setDeleting(false);
    }
  };

  const getBranchStock = (ing) => {
    if (selectedBranch === 'all') {
      return Object.values(ing.stockByBranch || {}).reduce((s, v) => s + (Number(v) || 0), 0);
    }
    return Number(ing.stockByBranch?.[selectedBranch] || 0);
  };

  const getStatusClass = (level) => {
    if (level === 'IN_STOCK') return 'is-in-stock';
    if (level === 'LOW_STOCK') return 'is-low-stock';
    if (level === 'CRITICAL') return 'is-critical';
    if (level === 'OUT_OF_STOCK') return 'is-out-of-stock';
    return 'is-inactive';
  };

  return (
    <div className="employees-page">
      {/* Heading matching Images 1-4 */}
      <div className="employees-heading">
        <div>
          <h2>Ingredients</h2>
          <p>View your ingredients, stock levels, and branch assignments.</p>
        </div>

        <div className="employees-heading-actions">
          <button
            type="button"
            className="employees-button employees-button-primary"
            onClick={openAddModal}
          >
            <Plus size={16} />
            + Add Ingredient
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
            placeholder="Search name, SKU, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <label className="employees-filter">
          <span>Category</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="employees-filter">
          <span>Branch</span>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="all">All branches</option>
            {branches.map((b) => (
              <option key={b.id || b._id} value={b.id || b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <label className="employees-filter">
          <span>Stock status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="IN_STOCK">Adequate Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="CRITICAL">Critically Low</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </label>
      </div>

      {/* Table Card matching People & HR and Actions from Image 5 */}
      <div className="employees-table-card">
        <div className="employees-table-heading">
          <div>
            <h3>All Ingredients</h3>
            <p>
              {ingredients.length} result{ingredients.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {ingredients.length === 0 ? (
          <div className="employees-empty-state">
            <Package size={26} />
            <h3>No ingredient records found</h3>
            <p>Try changing the filters or add a new ingredient record.</p>
          </div>
        ) : (
          <div className="employees-table-scroll">
            <table className="employees-table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Stock Level</th>
                  <th>Thresholds</th>
                  <th>Unit Cost</th>
                  <th>Total Value</th>
                  <th>Status</th>
                  <th style={{ width: '230px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ing) => {
                  const qty = getBranchStock(ing);
                  const status = InventoryService.calculateStockStatus(ing, selectedBranch);
                  const totalVal = Math.round(qty * (Number(ing.unitCost) || 0));

                  return (
                    <tr key={ing.id || ing._id}>
                      <td>
                        <div className="employees-person">
                          <span className="employees-avatar">
                            {(ing.name || 'I').trim().charAt(0).toUpperCase()}
                          </span>
                          <div className="employees-person-details">
                            <strong>{ing.name}</strong>
                            <span>Base Unit: {ing.baseUnit}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code>{ing.sku}</code>
                      </td>
                      <td>{ing.category}</td>
                      <td>
                        <strong>{qty} {ing.baseUnit}</strong>
                      </td>
                      <td>
                        <span>Min: {ing.minThreshold} {ing.baseUnit}</span>
                        <span style={{ color: '#748078', fontSize: '11px', display: 'block' }}>
                          Reorder: {ing.reorderLevel || '-'}
                        </span>
                      </td>
                      <td>₹{ing.unitCost}</td>
                      <td>
                        <strong>₹{totalVal.toLocaleString()}</strong>
                      </td>
                      <td>
                        <span className={`employees-status ${getStatusClass(status.level)}`}>
                          {status.text}
                        </span>
                      </td>
                      <td>
                        {/* Image 5: Edit | Deactivate/Adjust | Delete Action Group */}
                        <div className="employees-row-actions">
                          <button
                            type="button"
                            className="employees-button employees-button-secondary"
                            onClick={() => openEditModal(ing)}
                          >
                            <Pencil size={15} />
                            Edit
                          </button>

                          <button
                            type="button"
                            className="employees-button employees-button-secondary"
                            onClick={() => setAdjustTarget(ing)}
                          >
                            Adjust
                          </button>

                          <button
                            type="button"
                            className="employees-button employees-button-danger"
                            onClick={() => setDeleteConfirmTarget(ing)}
                            title={`Delete ${ing.name}`}
                            aria-label={`Delete ${ing.name}`}
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

      {/* Stock Adjustment Modal */}
      {adjustTarget && (
        <StockAdjustmentModal
          isOpen={!!adjustTarget}
          ingredient={adjustTarget}
          branchId={selectedBranch}
          branches={branches}
          onClose={() => setAdjustTarget(null)}
          onAdjusted={() => loadData()}
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

      {/* Add / Edit Ingredient Modal matching People & HR Form Modals */}
      {isFormOpen && (
        <div
          className="employees-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeFormModal();
          }}
        >
          <div className="employees-modal" role="dialog" aria-modal="true">
            <div className="employees-modal-heading">
              <div>
                <p className="employees-eyebrow">INGREDIENT CONFIGURATION</p>
                <h3>{editingIngredient ? 'Edit Ingredient' : 'Add New Ingredient'}</h3>
              </div>
              <button
                type="button"
                className="employees-modal-close"
                onClick={closeFormModal}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="employees-error" role="alert">
                <AlertCircle size={18} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveIngredient}>
              <div className="employees-form-grid">
                <label className="employees-field-full">
                  Ingredient Name *
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Organic Roma Tomatoes"
                    required
                  />
                </label>

                <label>
                  SKU Code
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="Auto-generated if blank"
                  />
                </label>

                <label>
                  Category *
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    required
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Base Unit *
                  <select
                    value={form.baseUnit}
                    onChange={(e) => setForm({ ...form, baseUnit: e.target.value })}
                    required
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="g">Grams (g)</option>
                    <option value="L">Liters (L)</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="box">Box (box)</option>
                  </select>
                </label>

                <label>
                  Unit Cost (₹) *
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.unitCost}
                    onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </label>

                <label>
                  Min Stock Threshold *
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.minThreshold}
                    onChange={(e) => setForm({ ...form, minThreshold: e.target.value })}
                    placeholder="e.g. 10"
                    required
                  />
                </label>

                <label>
                  Reorder Level
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.reorderLevel}
                    onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                    placeholder="Default 1.3x min"
                  />
                </label>

                <label className="employees-field-full">
                  Primary Supplier
                  <select
                    value={form.primarySupplierId}
                    onChange={(e) => setForm({ ...form, primarySupplierId: e.target.value })}
                  >
                    <option value="">Select primary supplier (optional)</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="employees-form-actions">
                <button
                  type="button"
                  className="employees-button employees-button-secondary"
                  onClick={closeFormModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="employees-button employees-button-primary"
                >
                  {editingIngredient ? 'Save Changes' : 'Create Ingredient'}
                </button>
              </div>
            </form>
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
            aria-labelledby="delete-ingredient-title"
            aria-describedby="delete-ingredient-description"
          >
            <div className="employees-delete-icon">
              <Trash2 size={24} />
            </div>

            <h3 id="delete-ingredient-title">Delete Ingredient?</h3>

            <p id="delete-ingredient-description">
              Are you sure you want to permanently delete{' '}
              <strong>{deleteConfirmTarget.name}</strong> ({deleteConfirmTarget.sku})? This action cannot be undone.
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
                onClick={() => handleDeleteIngredient(deleteConfirmTarget)}
                disabled={deleting}
              >
                <Trash2 size={16} />
                {deleting ? 'Deleting...' : 'Delete Ingredient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
