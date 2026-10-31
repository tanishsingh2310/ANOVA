import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  Plus,
  Pencil,
  RefreshCw,
  MapPin,
  X,
  Trash2,
  Eye,
  Boxes,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { InventoryService } from '../inventory/services/inventoryService'
import InventoryPagination from '../inventory/components/InventoryPagination'
import { apiClient } from '../../api/client'
import './branches.css'

const EMPTY_FORM = {
  name: '',
  code: '',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  phone: '',
  email: '',
}

export default function Branches({ user, onBranchesChange }) {
  const isAdmin = ['owner', 'admin'].includes(user?.role)

  const [branches, setBranches] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Modals state
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [viewingBranch, setViewingBranch] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Filters & sorting
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('NAME_ASC')
  const [notice, setNotice] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 6

  const request = useCallback(async (endpoint, options = {}) => {
    const normalized = endpoint.startsWith('/api')
      ? endpoint
      : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`
    return apiClient(normalized, options)
  }, [])

  const loadBranches = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const endpoint = isAdmin
        ? '/branches?includeInactive=true'
        : '/branches'

      const data = await request(endpoint)
      const list = Array.isArray(data?.branches)
        ? data.branches
        : (Array.isArray(data?.data) ? data.data : [])
      setBranches(list)
    } catch (err) {
      setError(err.message || 'Unable to load branches.')
    } finally {
      setLoading(false)
    }
  }, [isAdmin, request])

  const loadInventory = useCallback(async () => {
    try {
      const remote = await InventoryService.syncFromBackend('all')
      setIngredients(remote || InventoryService.getIngredients())
    } catch {
      setIngredients(InventoryService.getIngredients())
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBranches()
    loadInventory()
  }, [loadBranches, loadInventory])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, sortBy])

  function notifyBranchChange(detail = {}) {
    onBranchesChange?.()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('anova_branches_updated', { detail }))
    }
  }

  function openCreateForm() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setFormOpen(true)
    setNotice('')
  }

  function openEditForm(branch) {
    setEditingId(branch._id)

    setForm({
      name: branch.name || '',
      code: branch.code || '',
      street: branch.address?.street || '',
      city: branch.address?.city || '',
      state: branch.address?.state || '',
      postalCode: branch.address?.postalCode || '',
      country: branch.address?.country || '',
      phone: branch.phone || '',
      email: branch.email || '',
    })

    setFormOpen(true)
    setNotice('')
  }

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    const payload = {
      name: form.name.trim(),
      address: {
        street: form.street.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.postalCode.trim(),
        country: form.country.trim(),
      },
      phone: form.phone.trim(),
      email: form.email.trim(),
    }

    if (!editingId) {
      payload.code = form.code.trim()
    }

    try {
      await request(
        editingId ? `/branches/${editingId}` : '/branches',
        {
          method: editingId ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        },
      )

      setFormOpen(false)
      setNotice(editingId ? 'Branch details updated.' : 'Branch created successfully.')
      await loadBranches()
      notifyBranchChange()
    } catch (err) {
      setError(err.message || 'Unable to save the branch.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(branch) {
    const nextStatus = !branch.isActive
    const action = nextStatus ? 'activate' : 'deactivate'

    if (!window.confirm(`Are you sure you want to ${action} ${branch.name}?`)) {
      return
    }

    setError('')
    setNotice('')

    try {
      await request(`/branches/${branch._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextStatus }),
      })

      setNotice(`${branch.name} ${nextStatus ? 'activated' : 'deactivated'}.`)
      await loadBranches()
      notifyBranchChange()
    } catch (err) {
      setError(err.message || 'Unable to update branch status.')
    }
  }

  async function handleDeleteBranch() {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    setError('')
    setNotice('')

    try {
      await request(`/branches/${deleteTarget._id}`, {
        method: 'DELETE',
      })

      setNotice(`Branch "${deleteTarget.name}" removed successfully.`)
      setDeleteTarget(null)
      await loadBranches()
      notifyBranchChange({ deletedId: deleteTarget._id })
    } catch (err) {
      setError(err.message || 'Unable to delete branch.')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  // Branch inventory statistics calculation
  const getBranchInventoryStats = useCallback(
    (branch) => {
      if (!branch || !ingredients.length) {
        return { trackedItems: 0, totalValuation: 0, lowStockCount: 0, items: [] }
      }

      const branchKeys = [
        String(branch._id || branch.id),
        String(branch.code || '').toUpperCase(),
        String(branch.code || '').toLowerCase(),
      ].filter(Boolean)

      let trackedItems = 0
      let totalValuation = 0
      let lowStockCount = 0
      const branchItems = []

      for (const ing of ingredients) {
        const stockMap = ing.stockByBranch || {}
        let qty = 0
        for (const k of branchKeys) {
          if (stockMap[k] !== undefined) {
            qty = Number(stockMap[k] || 0)
            break
          }
        }

        if (qty > 0 || stockMap[branch._id] !== undefined || stockMap[branch.code] !== undefined) {
          trackedItems++
          const cost = Number(ing.unitCost || 0)
          const val = Math.round(qty * cost)
          totalValuation += val

          const min = Number(ing.minThreshold || 0)
          let statusText = 'Adequate Stock'
          let statusClass = 'is-in-stock'

          if (qty <= 0) {
            statusText = 'Out of Stock'
            statusClass = 'is-out-of-stock'
            lowStockCount++
          } else if (qty <= min) {
            statusText = 'Low Stock'
            statusClass = 'is-low-stock'
            lowStockCount++
          }

          branchItems.push({
            id: ing.id || ing._id,
            name: ing.name,
            sku: ing.sku,
            category: ing.category,
            baseUnit: ing.baseUnit,
            qty,
            unitCost: cost,
            valuation: val,
            statusText,
            statusClass,
          })
        }
      }

      return { trackedItems, totalValuation, lowStockCount, items: branchItems }
    },
    [ingredients],
  )


  // Filtering & Sorting
  const filteredBranches = useMemo(() => {
    return branches
      .filter((branch) => {
        // Status filter
        if (statusFilter === 'ACTIVE' && branch.isActive === false) return false
        if (statusFilter === 'INACTIVE' && branch.isActive !== false) return false

        // Search filter
        const searchText = search.trim().toLowerCase()
        if (!searchText) return true

        return [
          branch.name,
          branch.code,
          branch.address?.city,
          branch.address?.state,
        ].some((value) => String(value || '').toLowerCase().includes(searchText))
      })
      .sort((a, b) => {
        if (sortBy === 'NAME_ASC') return (a.name || '').localeCompare(b.name || '')
        if (sortBy === 'NAME_DESC') return (b.name || '').localeCompare(a.name || '')
        if (sortBy === 'CODE') return (a.code || '').localeCompare(b.code || '')
        if (sortBy === 'CITY') {
          return (a.address?.city || '').localeCompare(b.address?.city || '')
        }
        return 0
      })
  }, [branches, search, statusFilter, sortBy])

  const paginatedBranches = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredBranches.slice(start, start + PAGE_SIZE)
  }, [filteredBranches, currentPage])

  function addressText(address) {
    if (!address) return 'Address not provided'

    return (
      [
        address.street,
        address.city,
        address.state,
        address.postalCode,
        address.country,
      ]
        .filter(Boolean)
        .join(', ') || 'Address not provided'
    )
  }

  return (
    <section className="branches-page">
      {/* Top Toolbar */}
      <div className="branches-toolbar">
        <div>
          <p className="branches-subtitle">Manage restaurant locations, track branch-specific stock, and inspect inventory valuation.</p>
        </div>

        <div className="branches-actions">
          {isAdmin && (
            <button
              type="button"
              className="branches-button branches-button-primary"
              onClick={openCreateForm}
            >
              <Plus size={17} />
              Add branch
            </button>
          )}
          <button
            type="button"
            className="branches-button branches-button-secondary"
            onClick={() => {
              loadBranches()
              loadInventory()
            }}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {notice && (
        <div className="branches-notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss notice">
            <X size={15} />
          </button>
        </div>
      )}

      {error && (
        <div className="branches-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}


      {/* Main List & Controls */}
      <div className="branches-list-panel">
        <div className="branches-list-heading">
          <div>
            <h3>Restaurant Locations ({filteredBranches.length})</h3>
            <p>Branch-specific inventory summaries, valuation, and location details.</p>
          </div>

          <div className="branches-filters-bar">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, code, city..."
              aria-label="Search branches"
            />

            <select
              className="branches-select-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>

            <select
              className="branches-select-filter"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort branches"
            >
              <option value="NAME_ASC">Name (A–Z)</option>
              <option value="NAME_DESC">Name (Z–A)</option>
              <option value="CODE">Branch Code</option>
              <option value="CITY">City</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="branches-state">Loading branches…</div>
        ) : filteredBranches.length === 0 ? (
          <div className="branches-state">
            <MapPin size={26} />
            <strong>{search ? 'No matching branches found' : 'No branches available'}</strong>
            <p>
              {search
                ? 'Try clearing or modifying your search filters.'
                : 'Branches will appear here when configured in the system.'}
            </p>
          </div>
        ) : (
          <>
            <div className="branches-grid">
              {paginatedBranches.map((branch) => {
                const stats = getBranchInventoryStats(branch)

                return (
                  <article className="branch-card" key={branch._id || branch.id}>
                    <div className="branch-card-heading">
                      <div className="branch-card-icon">
                        <MapPin size={19} />
                      </div>

                      <span
                        className={`branch-status ${
                          branch.isActive === false ? 'branch-status-inactive' : ''
                        }`}
                      >
                        {branch.isActive === false ? 'Inactive' : 'Active'}
                      </span>
                    </div>

                    <h3>{branch.name}</h3>
                    {branch.code && (
                      <p className="branch-code">Branch code: <strong>{branch.code}</strong></p>
                    )}

                    <p className="branch-address">{addressText(branch.address)}</p>

                    {branch.phone && (
                      <p className="branch-contact">📞 {branch.phone}</p>
                    )}

                    {/* Branch Inventory Mini Summary */}
                    <div className="branch-inv-box">
                      <div className="branch-inv-header">
                        <span className="branch-inv-title">Inventory Overview</span>
                        {stats.lowStockCount > 0 ? (
                          <span className="branch-health-pill branch-health-warn">
                            <AlertTriangle size={11} /> {stats.lowStockCount} Alert{stats.lowStockCount > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="branch-health-pill branch-health-ok">
                            <CheckCircle size={11} /> Optimal
                          </span>
                        )}
                      </div>

                      <div className="branch-inv-stats">
                        <span>Items Tracked: <strong>{stats.trackedItems}</strong></span>
                        <span>Stock Valuation: <strong>₹{stats.totalValuation.toLocaleString()}</strong></span>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="branch-card-actions">
                      <button
                        type="button"
                        className="branches-button branches-button-secondary"
                        onClick={() => setViewingBranch(branch)}
                        title="View branch inventory breakdown"
                      >
                        <Eye size={15} />
                        View details
                      </button>

                      {isAdmin && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            className="branches-button branches-button-secondary"
                            onClick={() => openEditForm(branch)}
                            title="Edit branch details"
                          >
                            <Pencil size={15} />
                            Edit
                          </button>

                          <button
                            type="button"
                            className="branch-status-action"
                            onClick={() => toggleStatus(branch)}
                            title="Toggle branch active state"
                          >
                            {branch.isActive === false ? 'Activate' : 'Deactivate'}
                          </button>

                          <button
                            type="button"
                            className="branches-button branches-button-danger"
                            onClick={() => setDeleteTarget(branch)}
                            title={`Delete branch ${branch.name}`}
                            aria-label={`Delete branch ${branch.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>

            <div style={{ marginTop: '20px' }}>
              <InventoryPagination
                currentPage={currentPage}
                totalItems={filteredBranches.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        )}
      </div>

      {/* VIEW BRANCH DETAILS & INVENTORY BREAKDOWN MODAL */}
      {viewingBranch && (
        <div
          className="branches-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setViewingBranch(null)
          }}
        >
          <section
            className="branches-modal branches-view-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="view-branch-title"
          >
            <div className="branches-modal-heading">
              <div>
                <p className="branches-eyebrow">LOCATION & STOCK PROFILE</p>
                <h3 id="view-branch-title">{viewingBranch.name}</h3>
              </div>
              <button
                type="button"
                className="branches-close"
                onClick={() => setViewingBranch(null)}
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Grid */}
            <dl className="branch-view-grid">
              <div>
                <dt>Branch Code</dt>
                <dd><code>{viewingBranch.code || '—'}</code></dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span
                    className={`branch-status ${
                      viewingBranch.isActive === false ? 'branch-status-inactive' : ''
                    }`}
                  >
                    {viewingBranch.isActive === false ? 'Inactive' : 'Active'}
                  </span>
                </dd>
              </div>
              <div>
                <dt>City / State</dt>
                <dd>{viewingBranch.address?.city || '—'}, {viewingBranch.address?.state || '—'}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{addressText(viewingBranch.address)}</dd>
              </div>
              <div>
                <dt>Contact Phone</dt>
                <dd>{viewingBranch.phone || '—'}</dd>
              </div>
              <div>
                <dt>Email Address</dt>
                <dd>{viewingBranch.email || '—'}</dd>
              </div>
            </dl>

            {/* Inventory Overview Header */}
            {(() => {
              const stats = getBranchInventoryStats(viewingBranch)
              return (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '14px',
                    }}
                  >
                    <h4 style={{ margin: 0, color: 'var(--anova-forest, #183c34)' }}>
                      Branch Stock Inventory ({stats.items.length} items)
                    </h4>
                    <div style={{ display: 'flex', gap: '14px', fontSize: '13px' }}>
                      <span>Valuation: <strong>₹{stats.totalValuation.toLocaleString()}</strong></span>
                      {stats.lowStockCount > 0 && (
                        <span style={{ color: '#c93b3b', fontWeight: 600 }}>
                          ⚠ {stats.lowStockCount} Low Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {stats.items.length === 0 ? (
                    <div className="branches-state" style={{ minHeight: '120px' }}>
                      <Boxes size={24} />
                      <p>No inventory items are currently assigned to this branch.</p>
                    </div>
                  ) : (
                    <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid #e2ebe2', borderRadius: '8px' }}>
                      <table className="branch-items-table">
                        <thead>
                          <tr>
                            <th>Ingredient</th>
                            <th>SKU</th>
                            <th>Category</th>
                            <th>Stock</th>
                            <th>Unit Cost</th>
                            <th>Valuation</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.items.map((item) => (
                            <tr key={item.id}>
                              <td><strong>{item.name}</strong></td>
                              <td><code>{item.sku}</code></td>
                              <td>{item.category}</td>
                              <td><strong>{item.qty} {item.baseUnit}</strong></td>
                              <td>₹{item.unitCost}</td>
                              <td>₹{item.valuation.toLocaleString()}</td>
                              <td>
                                <span className={`employees-status ${item.statusClass}`}>
                                  {item.statusText}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })()}

            <div className="branches-form-actions">
              <button
                type="button"
                className="branches-button branches-button-secondary"
                onClick={() => setViewingBranch(null)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {/* CREATE / EDIT BRANCH MODAL */}
      {formOpen && (
        <div
          className="branches-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setFormOpen(false)
            }
          }}
        >
          <section
            className="branches-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="branch-form-title"
          >
            <div className="branches-modal-heading">
              <div>
                <p className="branches-eyebrow">BRANCH DETAILS</p>
                <h3 id="branch-form-title">
                  {editingId ? 'Edit branch' : 'Add a branch'}
                </h3>
              </div>

              <button
                type="button"
                className="branches-close"
                onClick={() => setFormOpen(false)}
                disabled={saving}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="branches-form-grid">
                <label>
                  Branch name *
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </label>

                <label>
                  Branch code *
                  <input
                    name="code"
                    value={form.code}
                    onChange={updateField}
                    minLength={2}
                    maxLength={20}
                    pattern="[a-zA-Z0-9_-]+"
                    title="Use letters, numbers, hyphens, or underscores."
                    disabled={Boolean(editingId)}
                    required={!editingId}
                  />
                </label>

                <label className="branches-field-full">
                  Street address
                  <input
                    name="street"
                    value={form.street}
                    onChange={updateField}
                    maxLength={200}
                  />
                </label>

                <label>
                  City
                  <input name="city" value={form.city} onChange={updateField} />
                </label>

                <label>
                  State
                  <input name="state" value={form.state} onChange={updateField} />
                </label>

                <label>
                  Postal code
                  <input
                    name="postalCode"
                    value={form.postalCode}
                    onChange={updateField}
                  />
                </label>

                <label>
                  Country
                  <input name="country" value={form.country} onChange={updateField} />
                </label>

                <label>
                  Phone
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={updateField}
                    maxLength={30}
                  />
                </label>

                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={updateField}
                  />
                </label>
              </div>

              <div className="branches-form-actions">
                <button
                  type="button"
                  className="branches-button branches-button-secondary"
                  onClick={() => setFormOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="branches-button branches-button-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create branch'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div
          className="branches-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteTarget(null)
          }}
        >
          <div className="branches-modal" role="dialog" aria-modal="true" style={{ maxWidth: '480px' }}>
            <div className="branches-modal-heading">
              <div>
                <p className="branches-eyebrow" style={{ color: '#c93b3b' }}>PERMANENT REMOVAL</p>
                <h3>Delete Branch</h3>
              </div>
              <button
                type="button"
                className="branches-close"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#3b4d44' }}>
              Are you sure you want to delete branch <strong>{deleteTarget.name}</strong> (<code>{deleteTarget.code}</code>)?
            </p>
            <p style={{ fontSize: '13px', lineHeight: 1.5, color: '#748078' }}>
              This will remove the branch from all selection dropdowns and forms. Note that branches with in-transit stock transfers cannot be deleted until those transfers are resolved.
            </p>

            <div className="branches-form-actions">
              <button
                type="button"
                className="branches-button branches-button-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="branches-button branches-button-danger"
                onClick={handleDeleteBranch}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete Branch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
