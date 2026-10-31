import { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  Truck
} from 'lucide-react';
import { SupplierService } from '../services/supplierService';
import InventoryPagination from '../components/InventoryPagination';
import { InventoryService } from '../services/inventoryService';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter]);

  // Modals / Drawers
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [form, setForm] = useState({
    name: '',
    code: '',
    category: 'Produce & Greens',
    contactPerson: '',
    email: '',
    phone: '',
    city: 'Mumbai',
    leadTimeDays: 2,
    paymentTerms: 'Net 30',
    taxId: ''
  });
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const loadData = async (refresh = false) => {
    const list = SupplierService.getSuppliers({
      category: categoryFilter,
      status: statusFilter,
      search
    });
    setSuppliers(list);
    setCategories(InventoryService.getCategories());

    setIsSyncing(true);
    try {
      await SupplierService.syncFromBackend();
      const fresh = SupplierService.getSuppliers({
        category: categoryFilter,
        status: statusFilter,
        search
      });
      setSuppliers(fresh);
      if (refresh) setNotice('Supplier directory refreshed.');
    } catch (err) {
      console.warn('Suppliers sync error:', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter, statusFilter, search]);

  const openAddModal = () => {
    setEditingSupplier(null);
    setForm({
      name: '',
      code: '',
      category: categories[0] || 'Produce & Greens',
      contactPerson: '',
      email: '',
      phone: '',
      city: 'Mumbai',
      leadTimeDays: 2,
      paymentTerms: 'Net 30',
      taxId: ''
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditModal = (sup) => {
    setEditingSupplier(sup);
    setForm({
      name: sup.name || '',
      code: sup.code || '',
      category: sup.category || categories[0] || 'Produce & Greens',
      contactPerson: sup.contactPerson || '',
      email: sup.email || '',
      phone: sup.phone || '',
      city: sup.city || 'Mumbai',
      leadTimeDays: sup.leadTimeDays || 2,
      paymentTerms: sup.paymentTerms || 'Net 30',
      taxId: sup.taxId || ''
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingSupplier(null);
    setFormError('');
  };


  const handleToggleStatus = async (supplier) => {
    try {
      await SupplierService.toggleStatusRemote(supplier.id);
      setNotice(`Supplier "${supplier.name}" ${supplier.status === 'ACTIVE' ? 'deactivated' : 'activated'} successfully.`);
      loadData();
    } catch (err) {
      alert(err.message || 'Error updating supplier status');
    }
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!form.name || !form.contactPerson || !form.phone || !form.email) {
      setFormError('Please fill in all mandatory contact and business fields');
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        category: form.category,
        contactPerson: form.contactPerson.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        leadTimeDays: Number(form.leadTimeDays || 2),
        paymentTerms: form.paymentTerms,
        taxId: form.taxId.trim()
      };

      if (editingSupplier) {
        payload.id = editingSupplier.id;
        payload._id = editingSupplier._id || editingSupplier.id;
        payload.status = editingSupplier.status;
        payload.rating = editingSupplier.rating;
      }

      await SupplierService.saveSupplierRemote(payload);
      closeFormModal();
      setNotice(editingSupplier ? 'Supplier updated successfully.' : 'Supplier onboarded successfully.');
      loadData();
    } catch (err) {
      setFormError(err.message || 'Error saving supplier');
    }
  };

  const handleDeleteSupplier = async (sup) => {
    if (!sup || deleting) return;
    setDeleting(true);
    setError('');
    setNotice('');
    try {
      await SupplierService.deleteSupplierRemote(sup.id || sup._id);
      setDeleteConfirmTarget(null);
      setNotice(`Supplier "${sup.name}" deleted successfully.`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete supplier');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="employees-page">
      {/* Heading matching Images 1-4 */}
      <div className="employees-heading">
        <div>
          <p>Manage verified suppliers, lead times, payment terms, and vendor contacts.</p>
        </div>

        <div className="employees-heading-actions">
          <button
            type="button"
            className="employees-button employees-button-primary"
            onClick={openAddModal}
          >
            <Plus size={16} />
            Add Supplier
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
            placeholder="Search name, code, contact, or city..."
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
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
      </div>

      {/* Table Card matching People & HR and Actions from Image 5 */}
      <div className="employees-table-card">
        <div className="employees-table-heading">
          <div>
            <h3>Vendor Directory</h3>
            <p>
              {suppliers.length} result{suppliers.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {suppliers.length === 0 ? (
          <div className="employees-empty-state">
            <Truck size={26} />
            <h3>No supplier records found</h3>
            <p>Try changing the filters or add a new supplier record.</p>
          </div>
        ) : (
          <div className="employees-table-scroll">
            <table className="employees-table">
              <thead>
                <tr>
                  <th style={{ whiteSpace: 'nowrap' }}>Vendor</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Code</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Category</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Contact Person</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Location</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Lead Time</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Payment Terms</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Rating</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ width: '240px', minWidth: '240px', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers
                  .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                  .map((sup) => (
                  <tr key={sup.id || sup._id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <strong style={{ color: '#183c34' }}>{sup.name}</strong>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <code>{sup.code || '—'}</code>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{sup.category}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span>{sup.contactPerson || '—'}</span>
                      {sup.phone && <span style={{ fontSize: '11px', color: '#748078', marginLeft: '6px' }}>({sup.phone})</span>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span>{sup.city || '—'}</span>
                      {sup.taxId && <span style={{ fontSize: '11px', color: '#748078', marginLeft: '6px' }}>• GST: {sup.taxId}</span>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <strong>{sup.leadTimeDays} days</strong>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{sup.paymentTerms}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#c48a36', fontWeight: 700 }}>
                        ★ {sup.rating || '4.5'}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span
                        className={`employees-status ${
                          sup.status === 'ACTIVE' ? 'is-active' : 'is-inactive'
                        }`}
                      >
                        {sup.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ width: '240px', minWidth: '240px', whiteSpace: 'nowrap' }}>
                      {/* Edit | Deactivate/Activate | Delete Action Group */}
                      <div className="employees-row-actions" style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap', gap: '8px' }}>
                        <button
                          type="button"
                          className="employees-button employees-button-secondary"
                          onClick={() => openEditModal(sup)}
                        >
                          <Pencil size={15} />
                          Edit
                        </button>

                        <button
                          type="button"
                          className="employees-button employees-button-secondary"
                          onClick={() => handleToggleStatus(sup)}
                        >
                          {sup.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>

                        <button
                          type="button"
                          className="employees-button employees-button-danger"
                          onClick={() => setDeleteConfirmTarget(sup)}
                          title={`Delete ${sup.name}`}
                          aria-label={`Delete ${sup.name}`}
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

        <InventoryPagination
          currentPage={currentPage}
          totalItems={suppliers.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Add / Edit Supplier Modal matching People & HR Form Modals */}
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
                <p className="employees-eyebrow">VENDOR REGISTRATION</p>
                <h3>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h3>
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

            <form onSubmit={handleSaveSupplier}>
              <div className="employees-form-grid">
                <label className="employees-field-full">
                  Supplier / Company Name *
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Verdant Harvest Organic Farms"
                    required
                  />
                </label>

                <label>
                  Vendor Code
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
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
                  Contact Person *
                  <input
                    type="text"
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    placeholder="Representative Name"
                    required
                  />
                </label>

                <label>
                  Phone Number *
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98200 00000"
                    required
                  />
                </label>

                <label>
                  Email Address *
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="orders@supplier.com"
                    required
                  />
                </label>

                <label>
                  City / Location
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Mumbai"
                  />
                </label>

                <label>
                  Lead Time (Days)
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={form.leadTimeDays}
                    onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
                    required
                  />
                </label>

                <label>
                  Payment Terms
                  <select
                    value={form.paymentTerms}
                    onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                  >
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 45">Net 45</option>
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Advance">Advance</option>
                  </select>
                </label>

                <label className="employees-field-full">
                  Tax / GST Identification Number
                  <input
                    type="text"
                    value={form.taxId}
                    onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                    placeholder="e.g. 27AABCV1234F1Z8"
                  />
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
                  {editingSupplier ? 'Save Changes' : 'Register Supplier'}
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
            aria-labelledby="delete-supplier-title"
            aria-describedby="delete-supplier-description"
          >
            <div className="employees-delete-icon">
              <Trash2 size={24} />
            </div>

            <h3 id="delete-supplier-title">Delete Supplier?</h3>

            <p id="delete-supplier-description">
              Are you sure you want to permanently delete supplier{' '}
              <strong>{deleteConfirmTarget.name}</strong> ({deleteConfirmTarget.code})? This action cannot be undone.
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
                onClick={() => handleDeleteSupplier(deleteConfirmTarget)}
                disabled={deleting}
              >
                <Trash2 size={16} />
                {deleting ? 'Deleting...' : 'Delete Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
