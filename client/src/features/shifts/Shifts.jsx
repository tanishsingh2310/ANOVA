import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search,
  RefreshCw,
  AlertCircle,
  Plus,
  X,
  Pencil,
  CheckCircle2,
  Ban,
  Trash2,
  CalendarDays,
} from 'lucide-react'
import { apiClient } from '../../api/client.js'
import './shifts.css'

const SHIFT_MANAGER_ROLES = ['owner', 'admin', 'hr', 'manager']

const ROLE_LABELS = {

  manager: 'Manager',
  hr: 'Human Resources',
  inventory_manager: 'Inventory Manager',
  chef: 'Chef',
  cashier: 'Cashier',
  delivery_personnel: 'Delivery Personnel',
  employee: 'Employee',
}

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

function getId(value) {
  if (!value) return ''
  if (typeof value === 'object') return value._id || value.id || ''
  return value
}

function getBranchName(branch, branches) {
  if (branch && typeof branch === 'object' && branch.name) {
    return branch.name
  }

  const id = getId(branch)
  const match = branches.find(
    (item) => String(item._id || item.id) === String(id)
  )

  return match?.name || 'Unknown branch'
}

function formatRole(role) {
  return ROLE_LABELS[role] || (role || 'Unknown').replaceAll('_', ' ')
}

function formatDateTime(value) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function toLocalDateTimeInput(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  )

  return localDate.toISOString().slice(0, 16)
}

function getErrorMessage(error, fallback) {
  return error?.message || fallback
}

export default function Shifts({ user }) {
  const canManageShifts = SHIFT_MANAGER_ROLES.includes(user?.role)
  const canManageAllBranches = ['owner', 'admin'].includes(user?.role)

  const [shifts, setShifts] = useState([])
  const [branches, setBranches] = useState([])
  const [employees, setEmployees] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)


  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const [branchesError, setBranchesError] = useState('')
  const [employeesError, setEmployeesError] = useState('')

  const [shiftToDelete, setShiftToDelete] = useState(null)
const [deleting, setDeleting] = useState(false)

  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingShift, setEditingShift] = useState(null)
  const [shiftToCancel, setShiftToCancel] = useState(null)
  const [shiftToComplete, setShiftToComplete] = useState(null)
  const [confirmationBusy, setConfirmationBusy] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    branch: '',
    employee: '',
    startTime: '',
    endTime: '',
    breakMinutes: '0',
    notes: '',
  })

  const loadBranches = useCallback(async () => {
    setBranchesError('')

    try {
      const data = await apiClient('/api/branches')

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.branches)
          ? data.branches
          : Array.isArray(data?.data?.branches)
            ? data.data.branches
            : []

      setBranches(list)
    } catch (err) {
      setBranches([])
      setBranchesError(getErrorMessage(err, 'Unable to load branches.'))
    }
  }, [])

  const loadEmployees = useCallback(async () => {
    setEmployeesError('')

    try {
      const data = await apiClient('/api/employees')
      const list = Array.isArray(data?.employees)
        ? data.employees
        : Array.isArray(data)
          ? data
          : []

      setEmployees(list.filter((employee) => employee.isActive !== false))
    } catch (err) {
      setEmployees([])
      setEmployeesError(getErrorMessage(err, 'Unable to load employees.'))
    }
  }, [])

  const loadShifts = useCallback(
    async ({ refresh = false } = {}) => {
      if (refresh) setRefreshing(true)
      else setLoading(true)

      setError('')

      try {
        const params = new URLSearchParams()

        if (statusFilter !== 'all') {
          params.set('status', statusFilter)
        }

        if (branchFilter !== 'all' && canManageAllBranches) {
          params.set('branchId', branchFilter)
        }

        if (dateFrom) {
          params.set('from', new Date(`${dateFrom}T00:00:00`).toISOString())
        }

        if (dateTo) {
          const exclusiveEnd = new Date(`${dateTo}T00:00:00`)
          exclusiveEnd.setDate(exclusiveEnd.getDate() + 1)
          params.set('to', exclusiveEnd.toISOString())
        }

        const query = params.toString()
        const data = await apiClient(
          `/api/shifts${query ? `?${query}` : ''}`
        )

        setShifts(Array.isArray(data?.shifts) ? data.shifts : [])
      } catch (err) {
        setError(getErrorMessage(err, 'Unable to load shifts.'))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [statusFilter, branchFilter, canManageAllBranches, dateFrom, dateTo]
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBranches()
    loadEmployees()
  }, [loadBranches, loadEmployees])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadShifts()
  }, [loadShifts])

  const filteredShifts = useMemo(() => {
    const term = search.trim().toLowerCase()

    return shifts.filter((shift) => {
      const branchName = getBranchName(shift.branch, branches)
      const employeeName =
        typeof shift.employee === 'object'
          ? shift.employee?.name || ''
          : ''

      const matchesSearch =
        !term ||
        shift.title?.toLowerCase().includes(term) ||
        employeeName.toLowerCase().includes(term) ||
        branchName.toLowerCase().includes(term) ||
        shift.employee?.email?.toLowerCase().includes(term)

      const matchesBranch =
        branchFilter === 'all' ||
        String(getId(shift.branch)) === String(branchFilter)

      return matchesSearch && matchesBranch
    })
  }, [shifts, search, branchFilter, branches])

  const visibleBranches = useMemo(() => {
    if (canManageAllBranches) return branches

    const assignedBranchId = getId(user?.branch)
    return branches.filter(
      (branch) =>
        String(branch._id || branch.id) === String(assignedBranchId)
    )
  }, [branches, canManageAllBranches, user?.branch])

  const availableEmployees = useMemo(() => {
    const selectedBranch = formData.branch

    return employees.filter((employee) => {
      if (!selectedBranch) return false

      return String(getId(employee.branch)) === String(selectedBranch)
    })
  }, [employees, formData.branch])

  function openCreateForm() {
    setEditingShift(null)
    setFormError('')
    setNotice('')

    const defaultBranch = canManageAllBranches
      ? ''
      : getId(user?.branch)

    setFormData({
      title: '',
      branch: defaultBranch,
      employee: '',
      startTime: '',
      endTime: '',
      breakMinutes: '0',
      notes: '',
    })

    setFormOpen(true)
  }

  function openEditForm(shift) {
    setEditingShift(shift)
    setFormError('')
    setNotice('')

    setFormData({
      title: shift.title || '',
      branch: getId(shift.branch),
      employee: getId(shift.employee),
      startTime: toLocalDateTimeInput(shift.startTime),
      endTime: toLocalDateTimeInput(shift.endTime),
      breakMinutes: String(shift.breakMinutes ?? 0),
      notes: shift.notes || '',
    })

    setFormOpen(true)
  }

  function closeForm() {
    if (saving) return
    setFormOpen(false)
    setEditingShift(null)
    setFormError('')
  }

  function updateFormField(event) {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === 'branch' ? { employee: '' } : {}),
    }))
  }

  async function handleSaveShift(event) {
    event.preventDefault()

    if (!canManageShifts) {
      setFormError('You do not have permission to manage shifts.')
      return
    }

    if (
      !formData.startTime ||
      !formData.endTime ||
      new Date(formData.endTime) <= new Date(formData.startTime)
    ) {
      setFormError('The shift end time must be after its start time.')
      return
    }

    const breakMinutes = Number(formData.breakMinutes)

    if (
      !Number.isInteger(breakMinutes) ||
      breakMinutes < 0 ||
      breakMinutes > 240
    ) {
      setFormError('Break must be a whole number between 0 and 240.')
      return
    }

    setSaving(true)
    setFormError('')
    setError('')
    setNotice('')

    try {
      const payload = {
        title: formData.title.trim(),
        branch: formData.branch,
        employee: formData.employee,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        breakMinutes,
        notes: formData.notes.trim(),
      }

      const endpoint = editingShift
        ? `/api/shifts/${editingShift._id}`
        : '/api/shifts'

      await apiClient(endpoint, {
        method: editingShift ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })

      setFormOpen(false)
      setEditingShift(null)
      setNotice(
        editingShift
          ? 'Shift updated successfully.'
          : 'Shift created successfully.'
      )

      await loadShifts({ refresh: true })
    } catch (err) {
      setFormError(getErrorMessage(err, 'Unable to save shift.'))
    } finally {
      setSaving(false)
    }
  }
  async function handleDeleteShift() {
  if (!shiftToDelete || deleting) return

  setDeleting(true)
  setError('')
  setNotice('')

  try {
    await apiClient(`/api/shifts/${shiftToDelete._id}`, {
      method: 'DELETE',
    })

    setNotice('Completed shift deleted successfully.')
    setShiftToDelete(null)
    await loadShifts({ refresh: true })
  } catch (err) {
    setError(getErrorMessage(err, 'Unable to delete shift.'))
  } finally {
    setDeleting(false)
  }
}

  async function handleCancelShift() {
    if (!shiftToCancel || confirmationBusy) return

    setConfirmationBusy(true)
    setError('')
    setNotice('')

    try {
      await apiClient(`/api/shifts/${shiftToCancel._id}/cancel`, {
        method: 'PATCH',
      })

      setNotice('Shift cancelled successfully.')
      setShiftToCancel(null)
      await loadShifts({ refresh: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to cancel shift.'))
    } finally {
      setConfirmationBusy(false)
    }
  }

  async function handleCompleteShift() {
    if (!shiftToComplete || confirmationBusy) return

    setConfirmationBusy(true)
    setError('')
    setNotice('')

    try {
      await apiClient(`/api/shifts/${shiftToComplete._id}/complete`, {
        method: 'PATCH',
      })

      setNotice('Shift marked as completed.')
      setShiftToComplete(null)
      await loadShifts({ refresh: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to complete shift.'))
    } finally {
      setConfirmationBusy(false)
    }
  }


  return (
    <section className="shifts-page">
      <div className="shifts-heading">
        <div>
          <p>Plan staff schedules and manage restaurant shifts.</p>
        </div>

        <div className="shifts-heading-actions">
          
          {canManageShifts && (
            <button
              type="button"
              className="shifts-button shifts-button-primary"
              onClick={openCreateForm}
            >
              <Plus size={16} />
              Create shift
            </button>
          )}
          <button
            type="button"
            className="shifts-button shifts-button-secondary"
            onClick={() => loadShifts({ refresh: true })}
            disabled={loading || refreshing}
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'shifts-spin' : ''}
            />
            Refresh
          </button>

        </div>
      </div>

      {notice && (
        <div className="shifts-notice" role="status">
          {notice}
        </div>
      )}

     
      <div className="shifts-toolbar">
        <label className="shifts-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search shift, employee, or branch..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label className="shifts-filter">
          <span>Branch</span>
          <select
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
          >
            <option value="all">All branches</option>
            {visibleBranches.map((branch) => {
              const id = branch._id || branch.id
              return (
                <option key={id} value={String(id)}>
                  {branch.name}
                </option>
              )
            })}
          </select>
        </label>

        <label className="shifts-filter">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label className="shifts-filter shifts-date-filter">
          <span>From</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </label>

        <label className="shifts-filter shifts-date-filter">
          <span>To</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </label>
      </div>

      {(branchesError || employeesError) && canManageShifts && (
        <div className="shifts-error" role="alert">
          <AlertCircle size={18} />
          <div>
            {branchesError && <p>{branchesError}</p>}
            {employeesError && <p>{employeesError}</p>}
          </div>
        </div>
      )}

      {error && (
        <div className="shifts-error" role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>Shift operation failed</strong>
            <p>{error}</p>
            <button type="button" onClick={() => loadShifts()}>
              Try again
            </button>
          </div>
        </div>
      )}

      {!error && loading ? (
  <div className="shifts-empty-state">
    <RefreshCw size={22} className="shifts-spin" />
    <p>Loading shift records...</p>
  </div>
) : !error && (
        <div className="shifts-table-card">
          <div className="shifts-table-heading">
            <div>
              <h3>Shift Schedule</h3>
              <p>
                {filteredShifts.length} result
                {filteredShifts.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {filteredShifts.length === 0 ? (
  <div className="shifts-empty-state">
    <CalendarDays size={26} />
    <h3>No shift records found</h3>
    <p>Try changing the filters or create a shift record.</p>
  </div>
) : (
            <div className="shifts-table-scroll">
              <table className="shifts-table">
                <thead>
                  <tr>
                    <th>Shift</th>
                    <th>Employee</th>
                    <th>Branch</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Break</th>
                    <th>Status</th>
                    {canManageShifts && <th>Actions</th>}
                  </tr>
                </thead>

                <tbody>
                  {filteredShifts.map((shift) => {
                    const employee =
                      typeof shift.employee === 'object'
                        ? shift.employee
                        : null

                    return (
                      <tr key={shift._id}>
                        <td>
                          <div className="shifts-title-cell">
                            <strong>{shift.title}</strong>
                            {shift.notes && (
                              <span title={shift.notes}>
                                {shift.notes}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="shifts-person-cell">
                            <strong>{employee?.name || 'Employee'}</strong>
                            <span>
                              {employee?.email || 'Employee details unavailable'}
                            </span>
                          </div>
                        </td>

                        <td>{getBranchName(shift.branch, branches)}</td>
                        <td>{formatDateTime(shift.startTime)}</td>
                        <td>{formatDateTime(shift.endTime)}</td>
                        <td>{shift.breakMinutes ?? 0} min</td>

                        <td>
                          <span
                            className={`shifts-status shifts-status-${shift.status}`}
                          >
                            {STATUS_LABELS[shift.status] || shift.status}
                          </span>
                        </td>

                        {canManageShifts && (
                          <td>
                            <div className="shifts-row-actions">
  {shift.status === 'scheduled' && (
    <>
      <button
        type="button"
        className="shifts-icon-button"
        title="Edit shift"
        aria-label={`Edit ${shift.title}`}
        onClick={() => openEditForm(shift)}
      >
        <Pencil size={16} />
      </button>

      <button
        type="button"
        className="shifts-icon-button shifts-icon-success"
        title="Mark completed"
        aria-label={`Complete ${shift.title}`}
        onClick={() => setShiftToComplete(shift)}
      >
        <CheckCircle2 size={16} />
      </button>

      <button
        type="button"
        className="shifts-icon-button shifts-icon-danger"
        title="Cancel shift"
        aria-label={`Cancel ${shift.title}`}
        onClick={() => setShiftToCancel(shift)}
      >
        <Ban size={16} />
      </button>
    </>
  )}

  {shift.status === 'completed' && (
    <button
      type="button"
      className="shifts-icon-button shifts-icon-danger"
      title="Delete completed shift"
      aria-label={`Delete ${shift.title}`}
      onClick={() => setShiftToDelete(shift)}
    >
      <Trash2 size={16} />
    </button>
  )}
</div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {formOpen && (
        <div
          className="shifts-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              closeForm()
            }
          }}
        >
          <section
            className="shifts-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shift-form-title"
          >
            <div className="shifts-modal-heading">
              <div>
                <p className="shifts-eyebrow">SHIFT SCHEDULING</p>
                <h3 id="shift-form-title">
                  {editingShift ? 'Edit shift' : 'Create shift'}
                </h3>
              </div>

              <button
                type="button"
                className="shifts-close-button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="shifts-error" role="alert">
                <AlertCircle size={18} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveShift}>
              <div className="shifts-form-grid">
                <label className="shifts-field-full">
                  Shift title *
                  <input
                    name="title"
                    value={formData.title}
                    onChange={updateFormField}
                    minLength={2}
                    maxLength={80}
                    placeholder="e.g. Morning Service"
                    required
                  />
                </label>

                <label>
                  Branch *
                  <select
                    name="branch"
                    value={formData.branch}
                    onChange={updateFormField}
                    required
                    disabled={!canManageAllBranches}
                  >
                    <option value="">Select branch</option>
                    {visibleBranches.map((branch) => {
                      const id = branch._id || branch.id
                      return (
                        <option key={id} value={String(id)}>
                          {branch.name}
                        </option>
                      )
                    })}
                  </select>
                </label>

                <label>
                  Employee *
                  <select
                    name="employee"
                    value={formData.employee}
                    onChange={updateFormField}
                    required
                    disabled={!formData.branch || employees.length === 0}
                  >
                    <option value="">Select employee</option>
                    {availableEmployees.map((employee) => (
                      <option key={employee._id} value={employee._id}>
                        {employee.name} — {formatRole(employee.role)}
                      </option>
                    ))}
                  </select>
                  {employeesError && (
                    <span className="shifts-field-help">
                      {employeesError}
                    </span>
                  )}
                  {!employeesError &&
                    formData.branch &&
                    availableEmployees.length === 0 && (
                      <span className="shifts-field-help">
                        No active employees were found in this branch.
                      </span>
                    )}
                </label>

                <label>
                  Start time *
                  <input
                    type="datetime-local"
                    name="startTime"
                    value={formData.startTime}
                    onChange={updateFormField}
                    required
                  />
                </label>

                <label>
                  End time *
                  <input
                    type="datetime-local"
                    name="endTime"
                    value={formData.endTime}
                    onChange={updateFormField}
                    min={formData.startTime || undefined}
                    required
                  />
                </label>

                <label>
                  Break (minutes)
                  <input
                    type="number"
                    name="breakMinutes"
                    value={formData.breakMinutes}
                    onChange={updateFormField}
                    min="0"
                    max="240"
                    step="1"
                    required
                  />
                </label>

                <label className="shifts-field-full">
                  Notes
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={updateFormField}
                    maxLength={500}
                    rows={3}
                    placeholder="Optional shift instructions"
                  />
                  <span className="shifts-field-help">
                    {formData.notes.length}/500 characters
                  </span>
                </label>
              </div>

              <div className="shifts-form-actions">
                <button
                  type="button"
                  className="shifts-button shifts-button-secondary"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="shifts-button shifts-button-primary"
                  disabled={
                    saving ||
                    !formData.branch ||
                    !formData.employee ||
                    !formData.startTime ||
                    !formData.endTime
                  }
                >
                  {saving
                    ? 'Saving…'
                    : editingShift
                      ? 'Save changes'
                      : 'Create shift'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {shiftToCancel && (
        <div
          className="shifts-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !confirmationBusy
            ) {
              setShiftToCancel(null)
            }
          }}
        >
          <section
            className="shifts-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-shift-title"
          >
            <span className="shifts-confirm-icon danger">
              <Ban size={23} />
            </span>
            <h3 id="cancel-shift-title">Cancel this shift?</h3>
            <p>
              <strong>{shiftToCancel.title}</strong> will be marked as
              cancelled. The shift record will be preserved.
            </p>
            <div className="shifts-form-actions">
              <button
                type="button"
                className="shifts-button shifts-button-secondary"
                onClick={() => setShiftToCancel(null)}
                disabled={confirmationBusy}
              >
                Keep shift
              </button>
              <button
                type="button"
                className="shifts-button shifts-button-danger"
                onClick={handleCancelShift}
                disabled={confirmationBusy}
              >
                {confirmationBusy ? 'Cancelling…' : 'Confirm cancellation'}
              </button>
            </div>
          </section>
        </div>
      )}

      {shiftToComplete && (
        <div
          className="shifts-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !confirmationBusy
            ) {
              setShiftToComplete(null)
            }
          }}
        >
          <section
            className="shifts-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="complete-shift-title"
          >
            <span className="shifts-confirm-icon success">
              <CheckCircle2 size={23} />
            </span>
            <h3 id="complete-shift-title">Complete this shift?</h3>
            <p>
              Mark <strong>{shiftToComplete.title}</strong> as completed?
            </p>
            <div className="shifts-form-actions">
              <button
                type="button"
                className="shifts-button shifts-button-secondary"
                onClick={() => setShiftToComplete(null)}
                disabled={confirmationBusy}
              >
                Go back
              </button>
              <button
                type="button"
                className="shifts-button shifts-button-primary"
                onClick={handleCompleteShift}
                disabled={confirmationBusy}
              >
                {confirmationBusy ? 'Updating…' : 'Mark completed'}
              </button>
            </div>
          </section>
        </div>
      )}
      {shiftToDelete && (
  <div
    className="shifts-modal-backdrop"
    onMouseDown={(event) => {
      if (
        event.target === event.currentTarget &&
        !deleting
      ) {
        setShiftToDelete(null)
      }
    }}
  >
    <section
      className="shifts-confirm-modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-shift-title"
    >
      <span className="shifts-confirm-icon danger">
        <Trash2 size={23} />
      </span>

      <h3 id="delete-shift-title">Delete completed shift?</h3>

      <p>
        Delete <strong>{shiftToDelete.title}</strong> permanently?
        This action cannot be undone.
      </p>

      <div className="shifts-form-actions">
        <button
          type="button"
          className="shifts-button shifts-button-secondary"
          onClick={() => setShiftToDelete(null)}
          disabled={deleting}
        >
          Keep shift
        </button>

        <button
          type="button"
          className="shifts-button shifts-button-danger"
          onClick={handleDeleteShift}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Delete shift'}
        </button>
      </div>
    </section>
  </div>
)}
    </section>
  )
}
