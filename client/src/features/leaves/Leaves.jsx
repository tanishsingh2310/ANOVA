import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Plus,
  Check,
  X,
  XCircle,
  Trash2,
} from 'lucide-react'
import { apiClient } from '../../api/client.js'
import './leaves.css'

const REVIEWER_ROLES = ['owner', 'admin', 'hr', 'manager']
const EMPLOYEE_ROLES = [
  'admin',  
  'manager',
  'hr',
  'inventory_manager',
  'chef',
  'cashier',
  'employee',
  'delivery_personnel',
]

const APPROVAL_HIERARCHY = {
  employee: ['manager', 'hr', 'admin', 'owner'],
  inventory_manager: ['manager', 'hr', 'admin', 'owner'],
  chef: ['manager', 'hr', 'admin', 'owner'],
  cashier: ['manager', 'hr', 'admin', 'owner'],
  delivery_personnel: ['manager', 'hr', 'admin', 'owner'],
  manager: ['hr', 'admin', 'owner'],
  hr: ['admin', 'owner'],
  admin: ['owner'],
  owner: [],
}

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

// Ensure these values match the leaveType enum in your LeaveRequest model.
const LEAVE_TYPES = [
  { value: 'casual', label: 'Casual leave' },
  { value: 'sick', label: 'Sick leave' },
  { value: 'annual', label: 'Annual leave' },
  { value: 'unpaid', label: 'Unpaid leave' },
  { value: 'emergency', label: 'Emergency leave' },
]

const getId = (value) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value._id || value.id || ''
}

const getName = (value) => {
  if (!value) return '—'
  if (typeof value === 'string') return value
  return value.name || value.email || '—'
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

export default function Leave({ user }) {
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

  const [showForm, setShowForm] = useState(false)
  const [reviewingRecord, setReviewingRecord] = useState(null)
  const [reviewStatus, setReviewStatus] = useState('approved')
  const [reviewNote, setReviewNote] = useState('')

  const [recordToDelete, setRecordToDelete] = useState(null)
const [deleting, setDeleting] = useState(false)

  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: '',
    employeeEmail: '',
    branchId: '',
  })

  const role = user?.role || ''
  const isReviewer = REVIEWER_ROLES.includes(role)
  const canSubmitSelf = EMPLOYEE_ROLES.includes(role)
  const needsEmployeeDetails = role === 'owner' || role === 'admin'

  const loadBranches = useCallback(async () => {
    try {
      const data = await apiClient('/api/branches')
      setBranches(Array.isArray(data?.branches) ? data.branches : [])
    } catch (err) {
      console.error('Unable to load branches:', err)
    }
  }, [])

  const loadLeaves = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    setError('')

    try {
      const params = new URLSearchParams()
      params.set('limit', '500')

      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)

      const data = await apiClient(`/api/leaves?${params.toString()}`)
      setRecords(Array.isArray(data?.leaveRequests) ? data.leaveRequests : [])
    } catch (err) {
      setError(getErrorMessage(err))
      setRecords([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, dateFrom, dateTo])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBranches()
  }, [loadBranches])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLeaves()
  }, [loadLeaves])

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase()

    return records.filter((record) => {
      const employee = record.employee || {}
      const branchName = getName(record.branch)
      const employeeName = getName(employee)
      const leaveType = String(record.leaveType || '').replace(/[-_]/g, ' ')

      const matchesSearch =
        !query ||
        `${employeeName} ${employee.email || ''} ${branchName} ${leaveType} ${record.reason || ''}`
          .toLowerCase()
          .includes(query)

      const matchesBranch =
        branchFilter === 'all' || getId(record.branch) === branchFilter

      return matchesSearch && matchesBranch
    })
  }, [records, search, branchFilter])

 

  const openForm = () => {
    setFormError('')
    setFormData({
      leaveType: 'casual',
      startDate: '',
      endDate: '',
      reason: '',
      employeeEmail: '',
      branchId: getId(user?.branch),
    })
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setFormError('')
  }

  const handleFormChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!formData.startDate || !formData.endDate || !formData.reason.trim()) {
      setFormError('Please complete all required fields.')
      return
    }

    if (formData.endDate < formData.startDate) {
      setFormError('End date cannot be before the start date.')
      return
    }

    if (
  needsEmployeeDetails &&
  (!formData.employeeEmail.trim() || !formData.branchId)
) {
  setFormError('Please enter the employee email and select a branch.')
  return
}

    setSaving(true)
    setError('')
    setNotice('')

    try {
      const payload = {
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason.trim(),
      }

      // Owners and admins must specify whose leave they are submitting.
      if (needsEmployeeDetails) {
        payload.employeeEmail = formData.employeeEmail.trim()
        payload.branchId = formData.branchId
      }

      await apiClient('/api/leaves', {
        method: 'POST',
        body: payload,
      })

      setNotice('Leave request submitted successfully.')
      setShowForm(false)
      await loadLeaves(true)
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const canReviewRecord = (record) => {
    if (!isReviewer || record.status !== 'pending') return false
    if (getId(record.employee) === getId(user)) return false

    const employeeRole = record.employee?.role
    return (APPROVAL_HIERARCHY[employeeRole] || []).includes(role)
  }

  const canCancelRecord = (record) => {
    if (record.status !== 'pending') return false
    if (getId(record.employee) === getId(user)) return true
    return isReviewer
  }

  const openReview = (record, status) => {
    setReviewingRecord(record)
    setReviewStatus(status)
    setReviewNote('')
    setFormError('')
  }

  const closeReview = () => {
    if (saving) return
    setReviewingRecord(null)
    setFormError('')
  }

  const handleReview = async (event) => {
    event.preventDefault()
    if (!reviewingRecord) return

    setSaving(true)
    setFormError('')
    setError('')
    setNotice('')

    try {
      await apiClient(`/api/leaves/${getId(reviewingRecord)}/review`, {
        method: 'PATCH',
        body: {
          status: reviewStatus,
          reviewNote: reviewNote.trim(),
        },
      })

      setNotice(`Leave request ${reviewStatus}.`)
      setReviewingRecord(null)
      await loadLeaves(true)
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async (record) => {
    if (!window.confirm('Cancel this pending leave request?')) return

    setSaving(true)
    setError('')
    setNotice('')

    try {
      await apiClient(`/api/leaves/${getId(record)}/cancel`, {
        method: 'PATCH',
        body: {},
      })

      setNotice('Leave request cancelled.')
      await loadLeaves(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

async function handleDeleteLeave() {
  if (!recordToDelete || deleting) return

  setDeleting(true)
  setError('')
  setNotice('')

  try {
    await apiClient(`/api/leaves/${getId(recordToDelete)}`, {
      method: 'DELETE',
    })

    setNotice('Leave request deleted successfully.')
    setRecordToDelete(null)
    await loadLeaves(true)
  } catch (err) {
    setError(getErrorMessage(err))
  } finally {
    setDeleting(false)
  }
}
  return (
    <section className="leave-page">
      <div className="leave-header">
        <div>
          <p>Submit leave requests and track their approval status.</p>
        </div>

        <div className="leave-header-actions">
          {(canSubmitSelf || needsEmployeeDetails) && (
            <button type="button" className="leave-primary-button" onClick={openForm}>
              <Plus size={16} />
              New Leave Request
            </button>
          )}

          <button
            type="button"
            className="leave-secondary-button"
            onClick={() => loadLeaves(true)}
            disabled={refreshing || loading}
          >
            <RefreshCw size={16} className={refreshing ? 'leave-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="leave-alert leave-alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" aria-label="Dismiss error" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {notice && (
        <div className="leave-alert leave-alert-success" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}>
            <X size={16} />
          </button>
        </div>
      )}

      

      <div className="leave-filter-card">
        <div className="leave-toolbar">
          <label className="leave-search">
            <Search size={17} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employee, leave type…"
              aria-label="Search leave requests"
            />
          </label>

          <label className="leave-filter">
            <span>Branch</span>
            <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
              <option value="all">All branches</option>
              {branches.map((branch) => (
                <option key={branch._id || branch.id} value={branch._id || branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>

          <label className="leave-filter">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="leave-filter">
            <span>From</span>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>

          <label className="leave-filter">
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

      <div className="leave-records-card">
        <div className="leave-table-summary">
          <h3>Leave Records</h3>
          <p>
            Showing {visibleRecords.length} record
            {visibleRecords.length === 1 ? '' : 's'}
          </p>
        </div>

        {loading ? (
          <div className="leave-empty-state">
            <RefreshCw size={22} className="leave-spin" />
            <p>Loading leave requests…</p>
          </div>
        ) : visibleRecords.length === 0 ? (
          <div className="leave-empty-state">
            <CalendarDays size={26} />
            <h3>No leave requests found</h3>
            <p>Try changing your filters, or submit a new leave request.</p>
          </div>
        ) : (
          <div className="leave-table-wrap">
            <table className="leave-table">
              <thead>
                <tr>
                  {isReviewer && <th>Employee</th>}
                  <th>Leave type</th>
                  <th>Branch</th>
                  <th>Start date</th>
                  <th>End date</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Reviewed by</th>
                  <th>Review note</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {visibleRecords.map((record) => {
                  const status = String(record.status || 'pending').toLowerCase()
                  const employee = record.employee || {}
                  const employeeName = getName(employee)
                  const leaveType = LEAVE_TYPES.find(
                    (item) => item.value === record.leaveType
                  )?.label || String(record.leaveType || '—').replace(/[-_]/g, ' ')

                  return (
                    <tr key={getId(record)}>
                      {isReviewer && (
                        <td>
                          <div className="leave-employee-cell">
                            <strong>{employeeName}</strong>
                            {employee.email && <small>{employee.email}</small>}
                            {employee.role && (
                              <small>{employee.role.replace(/_/g, ' ')}</small>
                            )}
                          </div>
                        </td>
                      )}

                      <td>{leaveType}</td>
                      <td>{getName(record.branch)}</td>
                      <td>{formatDate(record.startDate)}</td>
                      <td>{formatDate(record.endDate)}</td>
                      <td className="leave-reason-cell" title={record.reason}>
                        {record.reason || '—'}
                      </td>

                      <td>
                        <span className={`leave-status leave-status-${status}`}>
                          {STATUS_LABELS[status] || status}
                        </span>
                      </td>

                      <td>{getName(record.reviewedBy)}</td>
                      <td className="leave-reason-cell" title={record.reviewNote}>
                        {record.reviewNote || '—'}
                      </td>

                      <td>
                        <div className="leave-row-actions">
                          {canReviewRecord(record) && (
                            <>
                              <button
                                type="button"
                                className="leave-icon-button leave-approve-button"
                                title="Approve request"
                                aria-label={`Approve leave request for ${employeeName}`}
                                onClick={() => openReview(record, 'approved')}
                                disabled={saving}
                              >
                                <Check size={16} />
                              </button>
                              <button
                                type="button"
                                className="leave-icon-button leave-reject-button"
                                title="Reject request"
                                aria-label={`Reject leave request for ${employeeName}`}
                                onClick={() => openReview(record, 'rejected')}
                                disabled={saving}
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}

                          {canCancelRecord(record) && (
                            <button
                              type="button"
                              className="leave-small-button"
                              onClick={() => handleCancel(record)}
                              disabled={saving}
                            >
                              Cancel
                            </button>
                          )}

                          {isReviewer && (
  <button
    type="button"
    className="leave-icon-button leave-delete-button"
    title="Delete leave request"
    aria-label={`Delete leave request for ${employeeName}`}
    onClick={() => setRecordToDelete(record)}
    disabled={saving || deleting}
  >
    <Trash2 size={16} />
  </button>
)}
                          {!isReviewer &&
  !canReviewRecord(record) &&
  !canCancelRecord(record) && (
    <span className="leave-no-action">—</span>
  )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div
          className="leave-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm()
          }}
        >
          <section className="leave-modal" role="dialog" aria-modal="true" aria-labelledby="leave-form-title">
            <div className="leave-modal-header">
              <div>
                <h2 id="leave-form-title">New Leave Request</h2>
                <p>Enter the leave dates and reason.</p>
              </div>
              <button type="button" className="leave-icon-button" onClick={closeForm} disabled={saving} aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {formError && (
                <div className="leave-alert leave-alert-error" role="alert">
                  <AlertCircle size={18} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="leave-form-grid">
                {needsEmployeeDetails && (
                  <>
                    
<label className="leave-form-full">
  <span>Employee Email</span>
  <input
    type="email"
    name="employeeEmail"
    value={formData.employeeEmail}
    onChange={handleFormChange}
    placeholder="Enter the employee's registered email"
    autoComplete="off"
    required
  />
</label>


                    <label className="leave-form-full">
                      <span>Branch</span>
                      <select name="branchId" value={formData.branchId} onChange={handleFormChange} required>
                        <option value="">Select branch</option>
                        {branches.map((branch) => (
                          <option key={branch._id || branch.id} value={branch._id || branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}

                <label className="leave-form-full">
                  <span>Leave type</span>
                  <select name="leaveType" value={formData.leaveType} onChange={handleFormChange} required>
                    {LEAVE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Start date</span>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label>
                  <span>End date</span>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    min={formData.startDate || undefined}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label className="leave-form-full">
                  <span>Reason</span>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleFormChange}
                    rows="4"
                    maxLength={2000}
                    placeholder="Explain why you need leave…"
                    required
                  />
                </label>
              </div>

              <div className="leave-modal-actions">
                <button type="button" className="leave-secondary-button" onClick={closeForm} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="leave-primary-button" disabled={saving}>
                  {saving ? 'Submitting…' : 'Submit request'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {reviewingRecord && (
        <div
          className="leave-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeReview()
          }}
        >
          <section className="leave-modal" role="dialog" aria-modal="true" aria-labelledby="leave-review-title">
            <div className="leave-modal-header">
              <div>
                <h2 id="leave-review-title">
                  {reviewStatus === 'approved' ? 'Approve leave request' : 'Reject leave request'}
                </h2>
                <p>{getName(reviewingRecord.employee)}</p>
              </div>
              <button type="button" className="leave-icon-button" onClick={closeReview} disabled={saving} aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReview}>
              {formError && (
                <div className="leave-alert leave-alert-error" role="alert">
                  <AlertCircle size={18} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="leave-review-details">
                <p><strong>Leave type:</strong> {String(reviewingRecord.leaveType || '—').replace(/[-_]/g, ' ')}</p>
                <p><strong>Dates:</strong> {formatDate(reviewingRecord.startDate)} – {formatDate(reviewingRecord.endDate)}</p>
                <p><strong>Reason:</strong> {reviewingRecord.reason || '—'}</p>
              </div>

              <label className="leave-form-label">
                <span>Review note (optional)</span>
                <textarea
                  rows="4"
                  maxLength={1000}
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="Add a note for the employee…"
                />
              </label>

              <div className="leave-modal-actions">
                <button type="button" className="leave-secondary-button" onClick={closeReview} disabled={saving}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={reviewStatus === 'approved' ? 'leave-primary-button' : 'leave-danger-button'}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : reviewStatus === 'approved' ? 'Approve request' : 'Reject request'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {recordToDelete && (
  <div
    className="leave-modal-backdrop"
    onMouseDown={(event) => {
      if (
        event.target === event.currentTarget &&
        !deleting
      ) {
        setRecordToDelete(null)
      }
    }}
  >
    <section
      className="leave-confirm-modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-leave-title"
    >
      <span className="leave-confirm-icon danger">
        <Trash2 size={23} />
      </span>

      <h3 id="delete-leave-title">Delete leave request?</h3>

      <p>
        Permanently delete the leave request for{' '}
        <strong>{getName(recordToDelete.employee)}</strong>?
        This action cannot be undone.
      </p>

      <div className="leave-modal-actions">
        <button
          type="button"
          className="leave-secondary-button"
          onClick={() => setRecordToDelete(null)}
          disabled={deleting}
        >
          Keep request
        </button>

        <button
          type="button"
          className="leave-danger-button"
          onClick={handleDeleteLeave}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Delete request'}
        </button>
      </div>
    </section>
  </div>
)}
    </section>
  )
}
