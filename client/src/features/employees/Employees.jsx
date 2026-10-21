import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search,
  RefreshCw,
  AlertCircle,
  Plus,
  X,
  Pencil,
  Trash2,
} from 'lucide-react'
import { apiClient } from '../../api/client.js'
import './employees.css'

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  hr: 'Human Resources',
  inventory_manager: 'Inventory Manager',
  chef: 'Chef',
  cashier: 'Cashier',
  delivery_personnel: 'Delivery Personnel',
  employee: 'Employee',
}

function formatRole(role) {
  return ROLE_LABELS[role] || (role || 'Unknown').replaceAll('_', ' ')
}

function getBranchId(branch) {
  if (!branch) return ''
  if (typeof branch === 'object') return branch._id || branch.id || ''
  return branch
}

function getBranchName(branch, branches) {
  if (branch && typeof branch === 'object' && branch.name) {
    return branch.name
  }

  const branchId = getBranchId(branch)
  if (!branchId) return 'Unassigned'

  const match = branches.find(
    (item) => String(item._id || item.id) === String(branchId)
  )

  return match?.name || 'Unknown branch'
}

function getAvailableRoles(userRole) {
  if (userRole === 'hr') return ['employee']

  if (userRole === 'owner' || userRole === 'admin') {
    return [
      'employee',
      'admin',
      'chef',
      'cashier',
      'inventory_manager',
      'manager',
      'hr',
      'delivery_personnel',
    ]
  }

  return []
}

export default function Employees({ user }) {
  const [employees, setEmployees] = useState([])
  const [branches, setBranches] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusUpdatingId, setStatusUpdatingId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [error, setError] = useState('')
  const [branchesError, setBranchesError] = useState('')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [employeeToDelete, setEmployeeToDelete] = useState(null)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')

  const [formOpen, setFormOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    branch: '',
    isActive: true,
  })

  const canManage = ['owner', 'admin', 'hr'].includes(user?.role)
  const canViewInactive = canManage
  const availableRoles = getAvailableRoles(user?.role)

  const loadEmployees = useCallback(
    async ({ refresh = false } = {}) => {
      if (refresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError('')

      try {
        const includeInactive =
          statusFilter !== 'active' && canViewInactive

        const query = includeInactive ? '?includeInactive=true' : ''
        const data = await apiClient(`/api/employees${query}`)

        setEmployees(
          Array.isArray(data?.employees) ? data.employees : []
        )
      } catch (err) {
        setError(err.message || 'Unable to load employees.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [statusFilter, canViewInactive]
  )

  const loadBranches = useCallback(async () => {
    setBranchesError('')

    try {
      const data = await apiClient('/api/branches')

      const branchList = Array.isArray(data)
        ? data
        : Array.isArray(data?.branches)
          ? data.branches
          : Array.isArray(data?.data?.branches)
            ? data.data.branches
            : []

      setBranches(branchList)
    } catch (err) {
      setBranches([])
      setBranchesError(err.message || 'Unable to load branches.')
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBranches()
  }, [loadBranches])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEmployees()
  }, [loadEmployees])

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase()

    return employees.filter((employee) => {
      const matchesSearch =
        !term ||
        employee.name?.toLowerCase().includes(term) ||
        employee.email?.toLowerCase().includes(term) ||
        formatRole(employee.role).toLowerCase().includes(term) ||
        getBranchName(employee.branch, branches).toLowerCase().includes(term)

      const matchesRole =
        roleFilter === 'all' || employee.role === roleFilter

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && employee.isActive) ||
        (statusFilter === 'inactive' && !employee.isActive)

      const employeeBranchId = getBranchId(employee.branch)

      const matchesBranch =
        branchFilter === 'all' ||
        String(employeeBranchId) === String(branchFilter)

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus &&
        matchesBranch
      )
    })
  }, [
    employees,
    search,
    roleFilter,
    statusFilter,
    branches,
    branchFilter,
  ])

  function openCreateForm() {
    setEditingEmployee(null)
    setFormData({
      name: '',
      email: '',
      password: '',
      role: availableRoles.includes('employee')
        ? 'employee'
        : availableRoles[0] || 'employee',
      branch: user?.branch ? getBranchId(user.branch) : '',
      isActive: true,
    })
    setFormError('')
    setNotice('')
    setFormOpen(true)
  }

  function openEditForm(employee) {
    setEditingEmployee(employee)

    setFormData({
      name: employee.name || '',
      email: employee.email || '',
      password: '',
      role: employee.role || 'employee',
      branch: getBranchId(employee.branch),
      isActive: Boolean(employee.isActive),
    })

    setFormError('')
    setNotice('')
    setFormOpen(true)
  }

  function closeForm() {
    if (saving) return

    setFormOpen(false)
    setEditingEmployee(null)
    setFormError('')
  }

  function updateFormField(event) {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleSaveEmployee(event) {
    event.preventDefault()

    if (!canManage) {
      setFormError('You do not have permission to manage employees.')
      return
    }

    setSaving(true)
    setFormError('')
    setNotice('')

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        branch: formData.branch,
      }

      if (!editingEmployee) {
        payload.password = formData.password
      }

      const endpoint = editingEmployee
        ? `/api/employees/${editingEmployee._id}`
        : '/api/employees'

      await apiClient(endpoint, {
        method: editingEmployee ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })

      if (
        editingEmployee &&
        formData.isActive !== Boolean(editingEmployee.isActive)
      ) {
        await apiClient(
          `/api/employees/${editingEmployee._id}/status`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              isActive: formData.isActive,
            }),
          }
        )
      }

      setFormOpen(false)
      setEditingEmployee(null)
      setNotice(
        editingEmployee
          ? 'Employee updated successfully.'
          : 'Employee created successfully.'
      )

      await loadEmployees()
    } catch (err) {
      setFormError(err.message || 'Unable to save employee.')
    } finally {
      setSaving(false)
    }
  }

  function deleteEmployee(employee) {
    if (!canManage || statusUpdatingId || saving || deleting) return

    setError('')
    setNotice('')
    setEmployeeToDelete(employee)
  }

  async function confirmDeleteEmployee() {
    if (!employeeToDelete || deleting) return

    setDeleting(true)
    setError('')
    setNotice('')

    try {
      await apiClient(`/api/employees/${employeeToDelete._id}`, {
        method: 'DELETE',
      })

      setNotice('Employee deleted successfully.')
      setEmployeeToDelete(null)

      await loadEmployees({ refresh: true })
    } catch (err) {
      setError(err.message || 'Unable to delete employee.')
    } finally {
      setDeleting(false)
    }
  }

  async function toggleEmployeeStatus(employee) {
    if (!canManage || statusUpdatingId) return

    setStatusUpdatingId(employee._id)
    setError('')
    setNotice('')

    try {
      await apiClient(`/api/employees/${employee._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          isActive: !employee.isActive,
        }),
      })

      setNotice(
        employee.isActive
          ? 'Employee deactivated successfully.'
          : 'Employee activated successfully.'
      )

      await loadEmployees({ refresh: true })
    } catch (err) {
      setError(err.message || 'Unable to update employee status.')
    } finally {
      setStatusUpdatingId(null)
    }
  }

  return (
    <section className="employees-page">
      <div className="employees-heading">
        <div>
          <p>View your team, roles, and branch assignments.</p>
        </div>

        <div className="employees-heading-actions">
          {canManage && (
            <button
              type="button"
              className="employees-button employees-button-primary"
              onClick={openCreateForm}
            >
              <Plus size={16} />
              Add Employee / Staff
            </button>
          )}
          <button
            type="button"
            className="employees-button employees-button-secondary"
            onClick={() => loadEmployees({ refresh: true })}
            disabled={loading || refreshing}
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'employees-spin' : ''}
            />
            Refresh
          </button>

          
        </div>
      </div>

      {notice && (
        <div className="employees-notice" role="status">
          {notice}
        </div>
      )}

      {formOpen && (
        <div
          className="employees-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              closeForm()
            }
          }}
        >
          <section
            className="employees-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-form-title"
          >
            <div className="employees-modal-heading">
              <div>
                <p className="employees-eyebrow">EMPLOYEE DETAILS</p>
                <h3 id="employee-form-title">
                  {editingEmployee
                    ? 'Edit Employee'
                    : 'Add Employee / Staff'}
                </h3>
              </div>

              <button
                type="button"
                className="employees-modal-close"
                onClick={closeForm}
                disabled={saving}
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

            <form onSubmit={handleSaveEmployee}>
              <div className="employees-form-grid">
                <label>
                  Full name *
                  <input
                    name="name"
                    value={formData.name}
                    onChange={updateFormField}
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </label>

                <label>
                  Email *
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={updateFormField}
                    required
                  />
                </label>

                <label className="employees-field-full">
                  {editingEmployee
                    ? 'New password (not supported yet)'
                    : 'Temporary password *'}

                  <input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={updateFormField}
                    minLength={12}
                    autoComplete="new-password"
                    required={!editingEmployee}
                    disabled={Boolean(editingEmployee)}
                  />

                  <span className="employees-field-help">
                    {editingEmployee
                      ? 'Password changes are not supported by the current update endpoint.'
                      : 'Must contain at least 12 characters.'}
                  </span>
                </label>

                <label>
                  Role *
                  <select
                    name="role"
                    value={formData.role}
                    onChange={updateFormField}
                    required
                  >
                    {availableRoles.map((role) => (
                      <option key={role} value={role}>
                        {formatRole(role)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Branch *
                  <select
                    name="branch"
                    value={formData.branch}
                    onChange={updateFormField}
                    required
                    disabled={branches.length === 0}
                  >
                    <option value="">Select a branch</option>

                    {branches.map((branch) => (
                      <option
                        key={branch._id || branch.id}
                        value={branch._id || branch.id}
                      >
                        {branch.name}
                      </option>
                    ))}
                  </select>

                  {branchesError && (
                    <span className="employees-field-help" role="alert">
                      {branchesError}
                    </span>
                  )}

                  {!branchesError && branches.length === 0 && (
                    <span className="employees-field-help">
                      No branches are available. Check the branches API.
                    </span>
                  )}
                </label>

                {editingEmployee && (
                  <label>
                    Employment status *
                    <select
                      name="isActive"
                      value={formData.isActive ? 'active' : 'inactive'}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          isActive: event.target.value === 'active',
                        }))
                      }
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                )}
              </div>

              <div className="employees-form-actions">
                <button
                  type="button"
                  className="employees-button employees-button-secondary"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="employees-button employees-button-primary"
                  disabled={saving || branches.length === 0}
                >
                  {saving
                    ? 'Saving…'
                    : editingEmployee
                      ? 'Save changes'
                      : 'Create employee'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <div className="employees-toolbar">
        <label className="employees-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search name, email, role, or branch..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label className="employees-filter">
          <span>Role</span>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="all">All roles</option>

            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="employees-filter">
          <span>Branch</span>
          <select
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
          >
            <option value="all">All branches</option>

            {branches.map((branch) => {
              const branchId = branch._id || branch.id

              return (
                <option key={branchId} value={String(branchId)}>
                  {branch.name}
                </option>
              )
            })}
          </select>
        </label>

        <label className="employees-filter">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="active">Active</option>

            {canViewInactive && (
              <>
                <option value="inactive">Inactive</option>
                <option value="all">All statuses</option>
              </>
            )}
          </select>
        </label>
      </div>

      {error && (
        <div className="employees-error" role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>Employee operation failed</strong>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => loadEmployees()}
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {!error && loading ? (
        <div className="employees-state">
          Loading employee directory…
        </div>
      ) : (
        !error && (
          <div className="employees-table-card">
            <div className="employees-table-heading">
              <div>
                <h3>Team members</h3>
                <p>
                  {filteredEmployees.length} result
                  {filteredEmployees.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            {filteredEmployees.length === 0 ? (
              <div className="employees-state">
                {employees.length === 0
                  ? 'No employee records were returned by the API.'
                  : 'No employees match these search and filter settings.'}
              </div>
            ) : (
              <div className="employees-table-scroll">
                <table className="employees-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Role</th>
                      <th>Branch</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredEmployees.map((employee) => (
                      <tr key={employee._id}>
                        <td>
                          <div className="employees-person">
                            <span className="employees-avatar">
                              {(employee.name || '?')
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                            </span>

                            <span className="employees-person-details">
                              <strong>
                                {employee.name || 'Unnamed employee'}
                              </strong>
                              <span>{employee.email}</span>
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className="employees-role">
                            {formatRole(employee.role)}
                          </span>
                        </td>

                        <td>
                          {getBranchName(employee.branch, branches)}
                        </td>

                        <td>
                          <span
                            className={`employees-status ${
                              employee.isActive
                                ? 'is-active'
                                : 'is-inactive'
                            }`}
                          >
                            {employee.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td>
                          {canManage && (
                            <div className="employees-row-actions">
                              <button
                                type="button"
                                className="employees-button employees-button-secondary"
                                onClick={() => openEditForm(employee)}
                              >
                                <Pencil size={15} />
                                Edit
                              </button>

                              <button
                                type="button"
                                className="employees-button employees-button-secondary"
                                onClick={() => toggleEmployeeStatus(employee)}
                                disabled={
                                  statusUpdatingId === employee._id ||
                                  deleting
                                }
                              >
                                {statusUpdatingId === employee._id
                                  ? 'Updating…'
                                  : employee.isActive
                                    ? 'Deactivate'
                                    : 'Activate'}
                              </button>

                              <button
                                type="button"
                                className="employees-button employees-button-danger"
                                onClick={() => deleteEmployee(employee)}
                                disabled={
                                  Boolean(statusUpdatingId) ||
                                  saving ||
                                  deleting
                                }
                                title={`Delete ${employee.name || 'employee'}`}
                                aria-label={`Delete ${employee.name || 'employee'}`}
                              >
                                <Trash2 size={15} />
                                
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      )}

      {employeeToDelete && (
        <div
          className="employees-delete-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !deleting
            ) {
              setEmployeeToDelete(null)
            }
          }}
        >
          <div
            className="employees-delete-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-employee-title"
            aria-describedby="delete-employee-description"
          >
            <div className="employees-delete-icon">
              <Trash2 size={24} />
            </div>

            <h3 id="delete-employee-title">Delete employee?</h3>

            <p id="delete-employee-description">
              Are you sure you want to permanently delete{' '}
              <strong>
                {employeeToDelete.name || 'this employee'}
              </strong>
              ? This action cannot be undone.
            </p>

            <div className="employees-delete-actions">
              <button
                type="button"
                className="employees-button employees-button-secondary"
                onClick={() => setEmployeeToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="employees-button employees-button-danger"
                onClick={confirmDeleteEmployee}
                disabled={deleting}
              >
                <Trash2 size={16} />
                {deleting ? 'Deleting…' : 'Delete employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
