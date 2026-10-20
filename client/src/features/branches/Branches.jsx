
import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, RefreshCw, MapPin, X } from 'lucide-react'
import './branches.css'

const API_BASE = 'http://localhost:5000/api'
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

function getErrorMessage(data, fallback) {
  return data?.message || fallback
}

export default function Branches({ user }) {
  const isAdmin = ['owner', 'admin'].includes(user?.role)

  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')

  const request = useCallback(async (endpoint, options = {}) => {
    const token = sessionStorage.getItem('mbrems_token')

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })

    const data = await response.json().catch(() => null)

    if (response.status === 401) {
      throw new Error('Your session may have expired. Please sign in again.')
    }

    if (!response.ok) {
      throw new Error(getErrorMessage(data, 'The request could not be completed.'))
    }

    return data
  }, [])

  const loadBranches = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const endpoint = isAdmin
        ? '/branches?includeInactive=true'
        : '/branches'

      const data = await request(endpoint)
      setBranches(Array.isArray(data?.branches) ? data.branches : [])
    } catch (err) {
      setError(err.message || 'Unable to load branches.')
    } finally {
      setLoading(false)
    }
  }, [isAdmin, request])

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

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
      setNotice(editingId ? 'Branch details updated.' : 'Branch created.')
      await loadBranches()
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
    } catch (err) {
      setError(err.message || 'Unable to update branch status.')
    }
  }

  const filteredBranches = branches.filter((branch) => {
    const searchText = search.trim().toLowerCase()

    if (!searchText) return true

    return [
      branch.name,
      branch.code,
      branch.address?.city,
      branch.address?.state,
    ].some((value) => String(value || '').toLowerCase().includes(searchText))
  })

  function addressText(address) {
    if (!address) return 'Address not provided'

    return [
      address.street,
      address.city,
      address.state,
      address.postalCode,
      address.country,
    ].filter(Boolean).join(', ') || 'Address not provided'
  }

  return (
    <section className="branches-page">
      <div className="branches-toolbar">
        <div>
          <p>Manage and organize your branches in one place.</p>
        </div>

        <div className="branches-actions">
          <button
            type="button"
            className="branches-button branches-button-secondary"
            onClick={loadBranches}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

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
        </div>
      </div>

      {notice && (
        <div className="branches-notice" role="status">
          {notice}
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

      <div className="branches-summary">
        <div className="branches-summary-icon">
          <MapPin size={21} />
        </div>
        <div>
          <span className="branches-summary-label">Total Branches</span>
          <strong>{loading ? '—' : branches.length}</strong>
        </div>
      </div>

      <div className="branches-list-panel">
        <div className="branches-list-heading">
          <div>
            <h3>Restaurant locations</h3>
            <p>
              {isAdmin
                ? ''
                : ''}
            </p>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search branches..."
            aria-label="Search branches"
          />
        </div>

        {loading ? (
          <div className="branches-state">Loading branches…</div>
        ) : filteredBranches.length === 0 ? (
          <div className="branches-state">
            <MapPin size={26} />
            <strong>{search ? 'No matching branches' : 'No branches found'}</strong>
            <p>
              {search
                ? 'Try another search term.'
                : 'Branches will appear here when available to your account.'}
            </p>
          </div>
        ) : (
          <div className="branches-grid">
            {filteredBranches.map((branch) => (
              <article className="branch-card" key={branch._id}>
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
                  <p className="branch-code">Branch code: {branch.code}</p>
                )}

                <p className="branch-address">
                  {addressText(branch.address)}
                </p>

                {branch.phone && (
                  <p className="branch-contact">{branch.phone}</p>
                )}

                {isAdmin && (
                  <div className="branch-card-actions">
                    <button
                      type="button"
                      className="branches-button branches-button-secondary"
                      onClick={() => openEditForm(branch)}
                    >
                      <Pencil size={15} />
                      Edit details
                    </button>

                    <button
                      type="button"
                      className="branch-status-action"
                      onClick={() => toggleStatus(branch)}
                    >
                      {branch.isActive === false ? 'Activate' : 'Deactivate'}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

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
    </section>
  )
}
