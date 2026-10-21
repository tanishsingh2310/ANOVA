import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  Pencil,
  X,
} from 'lucide-react'
import { apiClient } from '../../api/client.js'
import './attendance.css'

const MANAGER_ROLES = ['owner', 'admin', 'hr', 'manager']

const STATUS_LABELS = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  'half-day': 'Half day',
}

const getId = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value._id || value.id || ''
}

const getBranchName = (branch) => {
  if (!branch) return '—'
  if (typeof branch === 'string') return branch
  return branch.name || '—'
}

const formatDateTime = (value) => {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDate = (value) => {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  'Something went wrong. Please try again.'

export default function Attendance({ user }) {
  const [records, setRecords] = useState([])
  const [branches, setBranches] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [editingRecord, setEditingRecord] = useState(null)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({
    status: 'present',
    clockIn: '',
    clockOut: '',
    breakMinutes: 0,
    notes: '',
  })

  const isManager = MANAGER_ROLES.includes(user?.role)
  const isEmployee = user?.role === 'employee'

  const loadBranches = useCallback(async () => {
    try {
      const data = await apiClient('/api/branches')
      setBranches(Array.isArray(data?.branches) ? data.branches : [])
    } catch (err) {
      console.error('Unable to load branches:', err)
    }
  }, [])

  const loadAttendance = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const params = new URLSearchParams()
      params.set('limit', '500')

      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      if (dateFrom) {
        params.set('from', dateFrom)
      }

      if (dateTo) {
        params.set('to', dateTo)
      }

      if (branchFilter !== 'all') {
        params.set('branch', branchFilter)
      }

      const data = await apiClient(
        `/api/attendance?${params.toString()}`
      )

      setRecords(Array.isArray(data?.attendance) ? data.attendance : [])
    } catch (err) {
      setError(getErrorMessage(err))
      setRecords([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, dateFrom, dateTo, branchFilter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBranches()
  }, [loadBranches])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAttendance()
  }, [loadAttendance])

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase()

    return records.filter((record) => {
      const employee = record.employee || {}
      const employeeName =
        employee.name ||
        `${employee.firstName || ''} ${employee.lastName || ''}`.trim()

      const employeeEmail = employee.email || ''
      const branchName = getBranchName(record.branch)
      const matchesSearch =
        !query ||
        `${employeeName} ${employeeEmail} ${branchName}`
          .toLowerCase()
          .includes(query)

      const matchesBranch =
        branchFilter === 'all' ||
        getId(record.branch) === branchFilter

      return matchesSearch && matchesBranch
    })
  }, [records, search, branchFilter])

  

  const handleClockIn = async () => {
    setSaving(true)
    setError('')
    setNotice('')

    try {
      await apiClient('/api/attendance/clock-in', {
        method: 'POST',
        body: {},
      })

      setNotice('Clocked in successfully.')
      await loadAttendance(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleClockOut = async (record) => {
    const breakValue = window.prompt(
      'Enter your break duration in minutes:',
      String(record.breakMinutes || 0)
    )

    if (breakValue === null) return

    const breakMinutes = Number(breakValue)

    if (
      !Number.isFinite(breakMinutes) ||
      breakMinutes < 0
    ) {
      setError('Break duration must be a non-negative number.')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')

    try {
      await apiClient(`/api/attendance/${getId(record)}/clock-out`, {
        method: 'PATCH',
        body: { breakMinutes },
      })

      setNotice('Clocked out successfully.')
      await loadAttendance(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (record) => {
    const toLocalInput = (value) => {
      if (!value) return ''

      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return ''

      const offset = date.getTimezoneOffset() * 60000
      return new Date(date.getTime() - offset)
        .toISOString()
        .slice(0, 16)
    }

    setEditingRecord(record)
    setFormError('')
    setFormData({
      status: record.status || 'present',
      clockIn: toLocalInput(record.clockIn),
      clockOut: toLocalInput(record.clockOut),
      breakMinutes: record.breakMinutes ?? 0,
      notes: record.notes || '',
    })
  }

  const closeEdit = () => {
    if (saving) return

    setEditingRecord(null)
    setFormError('')
  }

  const handleEditChange = (event) => {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: name === 'breakMinutes' ? value : value,
    }))
  }

  const handleSaveEdit = async (event) => {
    event.preventDefault()

    if (!editingRecord) return

    const breakMinutes = Number(formData.breakMinutes)

    if (!Number.isFinite(breakMinutes) || breakMinutes < 0) {
      setFormError('Break duration must be a non-negative number.')
      return
    }

    if (formData.clockOut && !formData.clockIn) {
      setFormError('Set a clock-in time before setting clock-out.')
      return
    }

    if (
      formData.clockIn &&
      formData.clockOut &&
      new Date(formData.clockOut) < new Date(formData.clockIn)
    ) {
      setFormError('Clock-out cannot be earlier than clock-in.')
      return
    }

    setSaving(true)
    setFormError('')
    setError('')
    setNotice('')

    try {
      await apiClient(`/api/attendance/${getId(editingRecord)}`, {
        method: 'PATCH',
        body: {
          status: formData.status,
          clockIn: formData.clockIn
            ? new Date(formData.clockIn).toISOString()
            : null,
          clockOut: formData.clockOut
            ? new Date(formData.clockOut).toISOString()
            : null,
          breakMinutes,
          notes: formData.notes,
        },
      })

      setNotice('Attendance record updated.')
      setEditingRecord(null)
      await loadAttendance(true)
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }



  const employeeHasOpenRecord = records.some(
    (record) =>
      getId(record.employee) === getId(user) &&
      !record.clockOut
  )

  return (
    <section className="attendance-page">
      <div className="attendance-header">
        <div>
          <p>Track attendance, working hours, and daily check-ins.</p>
        </div>

        <div className="attendance-header-actions">
          {isEmployee && !employeeHasOpenRecord && (
            <button
              type="button"
              className="attendance-primary-button"
              onClick={handleClockIn}
              disabled={saving}
            >
              <Clock size={16} />
              {saving ? 'Please wait…' : 'Clock in'}
            </button>
          )}

          <button
            type="button"
            className="attendance-secondary-button"
            onClick={() => loadAttendance(true)}
            disabled={refreshing || loading}
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'attendance-spin' : ''}
            />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="attendance-alert attendance-alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setError('')}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {notice && (
        <div className="attendance-alert attendance-alert-success" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setNotice('')}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="attendance-filter-card">
        <div className="attendance-toolbar">
          <label className="attendance-search">
            <Search size={17} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employee or branch…"
              aria-label="Search employee or branch"
            />
          </label>

          <label className="attendance-filter">
            <span>Branch</span>
            <select
              value={branchFilter}
              onChange={(event) => setBranchFilter(event.target.value)}
            >
              <option value="all">All branches</option>
              {branches.map((branch) => (
                <option
                  key={branch._id || branch.id}
                  value={branch._id || branch.id}
                >
                  {branch.name}
                </option>
              ))}
            </select>
          </label>

          <label className="attendance-filter">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="attendance-filter">
            <span>From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>

          <label className="attendance-filter">
            <span>To</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </label>

        </div>
      </div>

      <div className="attendance-records-card">
        <div className="attendance-table-summary">
          <h3>Attendance Records</h3>
    <p>
      Showing {visibleRecords.length} record
      {visibleRecords.length === 1 ? '' : 's'}
    </p>
        </div>

        {loading ? (
          <div className="attendance-empty-state">
            <RefreshCw size={22} className="attendance-spin" />
            <p>Loading attendance…</p>
          </div>
        ) : visibleRecords.length === 0 ? (
          <div className="attendance-empty-state">
            <Clock size={24} />
            <h3>No attendance records found</h3>
            <p>Try changing the branch, status, date range, or search.</p>
          </div>
        ) : (
          <div className="attendance-table-wrap">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Branch</th>
                  <th>Date</th>
                  <th>Clock in</th>
                  <th>Clock out</th>
                  <th>Break</th>
                  <th>Status</th>
                  <th>Review</th>
                  {(isManager || isEmployee) && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {visibleRecords.map((record) => {
                  const employee = record.employee || {}
                  const employeeName =
                    employee.name ||
                    `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
                    employee.email ||
                    'Unknown employee'

                  const status = String(
                    record.status || 'present'
                  ).toLowerCase()

                  const isOwnRecord =
                    getId(record.employee) === getId(user)

                  return (
                    <tr key={getId(record)}>
                      <td>
                        <div className="attendance-employee-cell">
                          <strong>{employeeName}</strong>
                          {employee.email && (
                            <small>{employee.email}</small>
                          )}
                        </div>
                      </td>

                      <td>{getBranchName(record.branch)}</td>
                      <td>{formatDate(record.date || record.clockIn)}</td>
                      <td>{formatDateTime(record.clockIn)}</td>
                      <td>{formatDateTime(record.clockOut)}</td>
                      <td>{Number(record.breakMinutes || 0)} min</td>

                      <td>
                        <span
                          className={`attendance-status attendance-status-${status.replace(
                            /[^a-z0-9-]/g,
                            ''
                          )}`}
                        >
                          {STATUS_LABELS[status] || status}
                        </span>
                      </td>

                      <td>{record.notes || '—'}</td>

                      {(isManager || isEmployee) && (
                        <td>
                          <div className="attendance-row-actions">
                            {isEmployee &&
                              isOwnRecord &&
                              !record.clockOut && (
                                <button
                                  type="button"
                                  className="attendance-small-button"
                                  onClick={() => handleClockOut(record)}
                                  disabled={saving}
                                >
                                  Clock out
                                </button>
                              )}

                            {isManager && (
                              <button
                                type="button"
                                className="attendance-icon-button"
                                onClick={() => openEdit(record)}
                                aria-label={`Edit attendance for ${employeeName}`}
                                title="Edit attendance"
                              >
                                <Pencil size={16} />
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

      {editingRecord && (
        <div
          className="attendance-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEdit()
          }}
        >
          <section
            className="attendance-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-edit-title"
          >
            <div className="attendance-modal-header">
              <div>
                <h2 id="attendance-edit-title">Edit attendance</h2>
                <p>
                  {editingRecord.employee?.name ||
                    editingRecord.employee?.email ||
                    'Attendance record'}
                </p>
              </div>

              <button
                type="button"
                className="attendance-icon-button"
                onClick={closeEdit}
                aria-label="Close edit dialog"
                disabled={saving}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              {formError && (
                <div
                  className="attendance-alert attendance-alert-error"
                  role="alert"
                >
                  <AlertCircle size={18} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="attendance-form-grid">
                <label>
                  <span>Status</span>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleEditChange}
                    required
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Break (minutes)</span>
                  <input
                    type="number"
                    name="breakMinutes"
                    min="0"
                    step="1"
                    value={formData.breakMinutes}
                    onChange={handleEditChange}
                  />
                </label>

                <label>
                  <span>Clock in</span>
                  <input
                    type="datetime-local"
                    name="clockIn"
                    value={formData.clockIn}
                    onChange={handleEditChange}
                  />
                </label>

                <label>
                  <span>Clock out</span>
                  <input
                    type="datetime-local"
                    name="clockOut"
                    value={formData.clockOut}
                    onChange={handleEditChange}
                  />
                </label>

                <label className="attendance-form-full">
                  <span>Notes</span>
                  <textarea
                    name="notes"
                    rows="3"
                    value={formData.notes}
                    onChange={handleEditChange}
                    placeholder="Optional notes or correction reason"
                  />
                </label>
              </div>

              <div className="attendance-modal-actions">
                <button
                  type="button"
                  className="attendance-secondary-button"
                  onClick={closeEdit}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="attendance-primary-button"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}