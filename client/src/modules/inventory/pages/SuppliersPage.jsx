import { useState, useEffect } from 'react';
import { SupplierService } from '../services/supplierService';
import { InventoryService } from '../services/inventoryService';
import StockBadge from '../components/StockBadge';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals / Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [catalogSupplier, setCatalogSupplier] = useState(null);
  const [suppliedItems, setSuppliedItems] = useState([]);

  // Form State
  const [form, setForm] = useState({
    name: '',
    code: '',
    category: 'Produce & Greens',
    contactPerson: '',
    email: '',
    phone: '',
    city: '',
    leadTimeDays: 2,
    paymentTerms: 'Net 30',
    taxId: ''
  });
  const [formError, setFormError] = useState('');

  const loadData = () => {
    const list = SupplierService.getSuppliers({
      category: categoryFilter,
      status: statusFilter,
      search
    });
    setSuppliers(list);
    setCategories(InventoryService.getCategories());
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter, statusFilter, search]);

  const handleOpenCatalog = (supplier) => {
    setCatalogSupplier(supplier);
    const items = SupplierService.getSuppliedIngredients(supplier.id);
    setSuppliedItems(items);
  };

  const handleToggleStatus = (supplierId) => {
    try {
      SupplierService.toggleStatus(supplierId);
      loadData();
    } catch (err) {
      alert(err.message || 'Error updating supplier status');
    }
  };

  const handleSaveSupplier = (e) => {
    e.preventDefault();
    if (!form.name || !form.contactPerson || !form.phone || !form.email) {
      setFormError('Please fill in all mandatory contact and business fields');
      return;
    }

    try {
      SupplierService.saveSupplier({
        ...form,
        leadTimeDays: Number(form.leadTimeDays)
      });
      setIsAddModalOpen(false);
      setForm({
        name: '',
        code: '',
        category: 'Produce & Greens',
        contactPerson: '',
        email: '',
        phone: '',
        city: '',
        leadTimeDays: 2,
        paymentTerms: 'Net 30',
        taxId: ''
      });
      loadData();
    } catch (err) {
      setFormError(err.message || 'Error saving supplier');
    }
  };

  return (
    <div className="inv-suppliers-page">
      {/* Toolbar */}
      <div className="inv-toolbar">
        <div className="inv-search-box">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search supplier, contact, city, GST..."
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
            aria-label="Filter by active status"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Suppliers</option>
            <option value="INACTIVE">Inactive Suppliers</option>
          </select>

          <button
            type="button"
            className="inv-btn inv-btn-primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            + Onboard New Supplier
          </button>
        </div>
      </div>

      {/* Supplier Table */}
      <div className="inv-card">
        <div className="inv-card-header">
          <div>
            <h3>Enterprise Supplier Network</h3>
            <p>Verified vendors, lead times, payment terms & reliability metrics</p>
          </div>
        </div>
        <div className="inv-card-body" style={{ padding: 0 }}>
          <div className="inv-table-wrapper">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Vendor Code</th>
                  <th>Supplier Name</th>
                  <th>Specialty Category</th>
                  <th>Primary Contact</th>
                  <th>Lead Time</th>
                  <th>Payment Terms</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                      No suppliers match your current filter.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((sup) => (
                    <tr key={sup.id}>
                      <td><code>{sup.code}</code></td>
                      <td>
                        <strong>{sup.name}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          📍 {sup.city} • GST: {sup.taxId || 'N/A'}
                        </div>
                      </td>
                      <td>{sup.category}</td>
                      <td>
                        <div>{sup.contactPerson}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          📞 {sup.phone} • ✉️ {sup.email}
                        </div>
                      </td>
                      <td><strong>{sup.leadTimeDays} days</strong></td>
                      <td>{sup.paymentTerms}</td>
                      <td>
                        <span style={{ color: 'var(--color-warning)', fontWeight: 700 }}>
                          ★ {sup.rating || '4.5'}
                        </span>
                      </td>
                      <td><StockBadge status={sup.status} /></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="inv-btn inv-btn-sm inv-btn-secondary"
                            onClick={() => handleOpenCatalog(sup)}
                          >
                            Catalog
                          </button>
                          <button
                            type="button"
                            className={`inv-btn inv-btn-sm ${sup.status === 'ACTIVE' ? 'inv-btn-secondary' : 'inv-btn-gold'}`}
                            onClick={() => handleToggleStatus(sup.id)}
                            title={sup.status === 'ACTIVE' ? 'Deactivate supplier' : 'Reactivate supplier'}
                          >
                            {sup.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Catalog Modal */}
      {catalogSupplier && (
        <div className="inv-modal-overlay">
          <div className="inv-modal-content">
            <div className="inv-modal-header">
              <div>
                <h3>Supplied Ingredients Catalog</h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {catalogSupplier.name} ({catalogSupplier.code})
                </p>
              </div>
              <button type="button" className="inv-modal-close" onClick={() => setCatalogSupplier(null)}>✕</button>
            </div>
            <div className="inv-modal-body">
              {suppliedItems.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No ingredients currently linked to this supplier.
                </div>
              ) : (
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Ingredient</th>
                      <th>Category</th>
                      <th>Unit Cost</th>
                      <th>Base Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliedItems.map(item => (
                      <tr key={item.id}>
                        <td><code>{item.sku}</code></td>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.category}</td>
                        <td>₹{item.unitCost}</td>
                        <td>{item.baseUnit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="inv-modal-footer">
              <button type="button" className="inv-btn inv-btn-secondary" onClick={() => setCatalogSupplier(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboard Supplier Modal */}
      {isAddModalOpen && (
        <div className="inv-modal-overlay">
          <div className="inv-modal-content">
            <div className="inv-modal-header">
              <h3>Onboard Vendor / Supplier</h3>
              <button type="button" className="inv-modal-close" onClick={() => setIsAddModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveSupplier}>
              <div className="inv-modal-body">
                {formError && <div className="inv-alert-banner inv-alert-danger">{formError}</div>}

                <div className="inv-form-row">
                  <div className="inv-form-group">
                    <label>Supplier Business Name *</label>
                    <input
                      type="text"
                      className="inv-form-control"
                      placeholder="e.g. Malabar Spice Traders"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="inv-form-group">
                    <label>Vendor Code</label>
                    <input
                      type="text"
                      className="inv-form-control"
                      placeholder="e.g. MST"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                    />
                  </div>
                </div>

                <div className="inv-form-row">
                  <div className="inv-form-group">
                    <label>Supply Category *</label>
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
                    <label>City / Hub Location</label>
                    <input
                      type="text"
                      className="inv-form-control"
                      placeholder="e.g. Mumbai / Pune"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                </div>

                <div className="inv-form-row">
                  <div className="inv-form-group">
                    <label>Primary Contact Person *</label>
                    <input
                      type="text"
                      className="inv-form-control"
                      placeholder="e.g. Rajesh Nair"
                      value={form.contactPerson}
                      onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                      required
                    />
                  </div>
                  <div className="inv-form-group">
                    <label>Phone Number *</label>
                    <input
                      type="text"
                      className="inv-form-control"
                      placeholder="+91 98..."
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="inv-form-row">
                  <div className="inv-form-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      className="inv-form-control"
                      placeholder="orders@vendor.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="inv-form-group">
                    <label>GST / Tax Identification ID</label>
                    <input
                      type="text"
                      className="inv-form-control"
                      placeholder="27AABC..."
                      value={form.taxId}
                      onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                    />
                  </div>
                </div>

                <div className="inv-form-row">
                  <div className="inv-form-group">
                    <label>Standard Lead Time (Days)</label>
                    <input
                      type="number"
                      min="1"
                      className="inv-form-control"
                      value={form.leadTimeDays}
                      onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
                    />
                  </div>
                  <div className="inv-form-group">
                    <label>Payment Terms</label>
                    <select
                      className="inv-form-control"
                      value={form.paymentTerms}
                      onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                    >
                      <option value="Net 15">Net 15 Days</option>
                      <option value="Net 30">Net 30 Days</option>
                      <option value="Net 45">Net 45 Days</option>
                      <option value="Due on Receipt">Due on Receipt</option>
                      <option value="Advance">Advance 100%</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="inv-modal-footer">
                <button type="button" className="inv-btn inv-btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="inv-btn inv-btn-primary">
                  Save & Register Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
