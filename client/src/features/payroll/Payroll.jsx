
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
  IndianRupee,
  Pencil,
  Ban,
    Trash2,
} from 'lucide-react'
import { apiClient } from '../../api/client.js'
import './payroll.css'

const PAYROLL_ROLES = ['owner', 'admin', 'hr']
const EMPLOYEE_EXCLUDED_ROLES = ['owner', 'admin', 'customer']

const STATUS_LABELS = {
  draft: 'Draft',
  approved: 'Approved',
  paid: 'Paid',
  cancelled: 'Cancelled',
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const EMPTY_FORM = {
  employeeId: '',
  branchId: '',
  year: String(new Date().getFullYear()),
  month: String(new Date().getMonth() + 1),
  basicSalary: '',
  allowances: '0',
  overtimePay: '0',
  deductions: '0',
  notes: '',
}

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

const formatMoney = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
const formatRole = (role = '') =>
  role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  'Something went wrong. Please try again.'

const getList = (data, ...keys) => {
  if (Array.isArray(data)) return data

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key]
  }

  return []
}

export default function Payroll({ user }) {
  const [records, setRecords] = useState([])
  const [branches, setBranches] = useState([])
  const [employees, setEmployees] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
const [recordToDelete, setRecordToDelete] = useState(null)
const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState(
    String(new Date().getFullYear()),
  )
  const [monthFilter, setMonthFilter] = useState(
    String(new Date().getMonth() + 1),
  )

  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [recordToApprove, setRecordToApprove] = useState(null)
  const [recordToPay, setRecordToPay] = useState(null)
  const [recordToCancel, setRecordToCancel] = useState(null)

  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [paymentData, setPaymentData] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentReference: '',
  })

  const role = user?.role || ''
  const canManagePayroll = PAYROLL_ROLES.includes(role)
  const canSelectBranch = role === 'owner' || role === 'admin'

  const loadBranches = useCallback(async () => {
    try {
      const data = await apiClient('/api/branches')
      setBranches(getList(data, 'branches'))
    } catch (err) {
      console.error('Unable to load branches:', err)
    }
  }, [])

  const loadEmployees = useCallback(async () => {
  try {
    const data = await apiClient('/api/employees')

    const list = getList(data, 'employees', 'users')

    setEmployees(
      list.filter(
        (employee) =>
          employee.isActive !== false &&
          !EMPLOYEE_EXCLUDED_ROLES.includes(employee.role),
      ),
    )
  } catch (err) {
    console.error('Unable to load employees:', err)
    setEmployees([])
  }
}, [])

  const loadPayroll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    setError('')

    try {
      const params = new URLSearchParams()

      if (yearFilter !== 'all') params.set('year', yearFilter)
      if (monthFilter !== 'all') params.set('month', monthFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const data = await apiClient(`/api/payroll?${params.toString()}`)
      setRecords(getList(data, 'payrolls'))
    } catch (err) {
      setError(getErrorMessage(err))
      setRecords([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [yearFilter, monthFilter, statusFilter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBranches()
    loadEmployees()
  }, [loadBranches, loadEmployees])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPayroll()
  }, [loadPayroll])

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase()

    return records.filter((record) => {
      const employee = record.employee || {}
      const branchName = getName(record.branch)
      const employeeName = getName(employee)
      const period = record.payPeriod || {}

      const matchesSearch =
        !query ||
        `${employeeName} ${employee.email || ''} ${branchName} ${employee.role || ''}`
          .toLowerCase()
          .includes(query)

      const matchesBranch =
        branchFilter === 'all' ||
        getId(record.branch) === branchFilter

      const matchesYear =
        yearFilter === 'all' ||
        String(period.year) === yearFilter

      const matchesMonth =
        monthFilter === 'all' ||
        String(period.month) === monthFilter

      const matchesStatus =
        statusFilter === 'all' ||
        record.status === statusFilter

      return (
        matchesSearch &&
        matchesBranch &&
        matchesYear &&
        matchesMonth &&
        matchesStatus
      )
    })
  }, [
    records,
    search,
    branchFilter,
    yearFilter,
    monthFilter,
    statusFilter,
  ])


 

  const openCreateForm = () => {
    setEditingRecord(null)
    setFormError('')
    setFormData({
      ...EMPTY_FORM,
      branchId: canSelectBranch ? '' : getId(user?.branch),
    })
    setShowForm(true)
  }

  const openEditForm = (record) => {
    setEditingRecord(record)
    setFormError('')
    setFormData({
      employeeId: getId(record.employee),
      branchId: getId(record.branch),
      year: String(record.payPeriod?.year || new Date().getFullYear()),
      month: String(record.payPeriod?.month || new Date().getMonth() + 1),
      basicSalary: String(record.basicSalary ?? ''),
      allowances: String(record.allowances ?? 0),
      overtimePay: String(record.overtimePay ?? 0),
      deductions: String(record.deductions ?? 0),
      notes: record.notes || '',
    })
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setEditingRecord(null)
    setFormError('')
  }

  const handleFormChange = (event) => {
  const { name, value } = event.target

  setFormData((current) => ({
    ...current,
    [name]: value,
    ...(name === 'branchId' ? { employeeId: '' } : {}),
  }))
}

  const selectedEmployees = useMemo(() => {
  const selectedBranchId = String(getId(formData.branchId)).trim()

  if (!selectedBranchId) return []

  return employees.filter((employee) => {
    const employeeBranchId = String(
      getId(
        employee.branch ??
        employee.branchId ??
        employee.assignedBranch
      )
    ).trim()

    return employeeBranchId === selectedBranchId
  })
}, [employees, formData.branchId])

  const calculateAmounts = (data) => {
    const basicSalary = Number(data.basicSalary)
    const allowances = Number(data.allowances || 0)
    const overtimePay = Number(data.overtimePay || 0)
    const deductions = Number(data.deductions || 0)

    const values = [
      basicSalary,
      allowances,
      overtimePay,
      deductions,
    ]

    if (
      values.some(
        (value) => !Number.isFinite(value) || value < 0,
      )
    ) {
      return { error: 'All salary amounts must be non-negative numbers.' }
    }

    const grossPay = basicSalary + allowances + overtimePay
    const netPay = grossPay - deductions

    if (netPay < 0) {
      return { error: 'Deductions cannot exceed gross pay.' }
    }

    return { grossPay, netPay }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!editingRecord && (!formData.employeeId || !formData.branchId)) {
      setFormError('Please select an employee and branch.')
      return
    }

    if (!formData.basicSalary.trim()) {
      setFormError('Please enter the basic salary.')
      return
    }

    const calculation = calculateAmounts(formData)

    if (calculation.error) {
      setFormError(calculation.error)
      return
    }

    setSaving(true)
    setError('')
    setNotice('')

    try {
      if (editingRecord) {
        await apiClient(`/api/payroll/${getId(editingRecord)}`, {
          method: 'PATCH',
          body: {
            basicSalary: Number(formData.basicSalary),
            allowances: Number(formData.allowances || 0),
            overtimePay: Number(formData.overtimePay || 0),
            deductions: Number(formData.deductions || 0),
            notes: formData.notes.trim(),
          },
        })

        setNotice('Payroll record updated successfully.')
      } else {
        await apiClient('/api/payroll', {
          method: 'POST',
          body: {
            employeeId: formData.employeeId,
            branchId: formData.branchId,
            year: Number(formData.year),
            month: Number(formData.month),
            basicSalary: Number(formData.basicSalary),
            allowances: Number(formData.allowances || 0),
            overtimePay: Number(formData.overtimePay || 0),
            deductions: Number(formData.deductions || 0),
            notes: formData.notes.trim(),
          },
        })

        setNotice('Payroll record created successfully.')
      }

      setShowForm(false)
      setEditingRecord(null)
      await loadPayroll(true)
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async () => {
    if (!recordToApprove || saving) return

    setSaving(true)
    setError('')
    setNotice('')

    try {
      await apiClient(
        `/api/payroll/${getId(recordToApprove)}/approve`,
        { method: 'PATCH', body: {} },
      )

      setNotice('Payroll approved successfully.')
      setRecordToApprove(null)
      await loadPayroll(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleMarkPaid = async (event) => {
    event.preventDefault()
    if (!recordToPay || saving) return

    if (!paymentData.paymentDate) {
      setError('Please select the payment date.')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')

    try {
      await apiClient(
        `/api/payroll/${getId(recordToPay)}/pay`,
        {
          method: 'PATCH',
          body: {
            paymentDate: paymentData.paymentDate,
            paymentReference: paymentData.paymentReference.trim(),
          },
        },
      )

      setNotice('Payroll marked as paid successfully.')
      setRecordToPay(null)
      await loadPayroll(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    if (!recordToCancel || saving) return

    setSaving(true)
    setError('')
    setNotice('')

    try {
      await apiClient(
        `/api/payroll/${getId(recordToCancel)}/cancel`,
        { method: 'PATCH', body: {} },
      )

      setNotice('Payroll record cancelled successfully.')
      setRecordToCancel(null)
      await loadPayroll(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }
const handleDeletePayroll = async () => {
  if (!recordToDelete || deleting) return

  setDeleting(true)
  setError('')
  setNotice('')

  try {
    await apiClient(`/api/payroll/${getId(recordToDelete)}`, {
      method: 'DELETE',
    })

    setNotice('Payroll record deleted successfully.')
    setRecordToDelete(null)
    await loadPayroll(true)
  } catch (err) {
    setError(getErrorMessage(err))
  } finally {
    setDeleting(false)
  }
}
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const values = new Set([
      currentYear,
      currentYear - 1,
      currentYear - 2,
      ...records.map((record) => Number(record.payPeriod?.year)),
    ])

    return [...values]
      .filter((year) => year >= 2020 && year <= 2100)
      .sort((a, b) => b - a)
  }, [records])

  if (!canManagePayroll) {
    return (
      <section className="payroll-page">
        <div className="payroll-alert payroll-alert-error" role="alert">
          <AlertCircle size={18} />
          <span>You are not authorized to access payroll management.</span>
        </div>
      </section>
    )
  }

  return (
    <section className="payroll-page">
      <div className="payroll-header">
        <div>
          <p>Manage employee salaries, approvals and monthly payments.</p>
        </div>

        <div className="payroll-header-actions">
          <button
            type="button"
            className="payroll-primary-button"
            onClick={openCreateForm}
          >
            <Plus size={16} />
            Create Payroll
          </button>

          <button
            type="button"
            className="payroll-secondary-button"
            onClick={() => loadPayroll(true)}
            disabled={refreshing || loading}
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'payroll-spin' : ''}
            />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="payroll-alert payroll-alert-error" role="alert">
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
        <div className="payroll-alert payroll-alert-success" role="status">
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

     
      <div className="payroll-filter-card">
        <div className="payroll-toolbar">
          <label className="payroll-search">
            <Search size={17} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employee or branch..."
              aria-label="Search payroll records"
            />
          </label>

          <label className="payroll-filter">
            <span>Branch</span>
            <select
              value={branchFilter}
              onChange={(event) => setBranchFilter(event.target.value)}
            >
              <option value="all">All branches</option>
              {branches.map((branch) => (
                <option key={getId(branch)} value={getId(branch)}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>

          <label className="payroll-filter">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="payroll-filter">
            <span>Month</span>
            <select
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
            >
              <option value="all">All months</option>
              {MONTHS.map((month, index) => (
                <option key={month} value={String(index + 1)}>
                  {month}
                </option>
              ))}
            </select>
          </label>

          <label className="payroll-filter">
            <span>Year</span>
            <select
              value={yearFilter}
              onChange={(event) => setYearFilter(event.target.value)}
            >
              <option value="all">All years</option>
              {years.map((year) => (
                <option key={year} value={String(year)}>{year}</option>
              ))}
            </select>
          </label>


        </div>
      </div>

      <div className="payroll-records-card">
        <div className="payroll-table-summary">
          <div>
            <h3>Payroll Records</h3>
            <p>
              Showing {visibleRecords.length} record
              {visibleRecords.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="payroll-empty-state">
            <RefreshCw size={22} className="payroll-spin" />
            <p>Loading payroll records...</p>
          </div>
        ) : visibleRecords.length === 0 ? (
          <div className="payroll-empty-state">
            <CalendarDays size={26} />
            <h3>No payroll records found</h3>
            <p>Try changing the filters or create a payroll record.</p>
          </div>
        ) : (
          <div className="payroll-table-wrap">
            <table className="payroll-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Branch</th>
                  <th>Pay period</th>
                  <th>Basic salary</th>
                  <th>Gross pay</th>
                  <th>Deductions</th>
                  <th>Net pay</th>
                  <th>Status</th>
                  <th>Payment date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {visibleRecords.map((record) => {
                  const status = String(record.status || 'draft').toLowerCase()
                  const employee = record.employee || {}
                  const period = record.payPeriod || {}
                  const employeeName = getName(employee)

                  return (
                    <tr key={getId(record)}>
                      <td>
                        <div className="payroll-employee-cell">
                          <strong>{employeeName}</strong>
                          {employee.email && <small>{employee.email}</small>}
                          {employee.role && (
                            <small>{employee.role.replace(/_/g, ' ')}</small>
                          )}
                        </div>
                      </td>

                      <td>{getName(record.branch)}</td>
                      <td>
                        {MONTHS[(Number(period.month) || 1) - 1]} {period.year || '—'}
                      </td>
                      <td>{formatMoney(record.basicSalary)}</td>
                      <td>{formatMoney(record.grossPay)}</td>
                      <td>{formatMoney(record.deductions)}</td>
                      <td><strong>{formatMoney(record.netPay)}</strong></td>
                      <td>
                        <span className={`payroll-status payroll-status-${status}`}>
                          {STATUS_LABELS[status] || status}
                        </span>
                      </td>
                      <td>{formatDate(record.paymentDate)}</td>

                      <td>
                        <div className="payroll-row-actions">
                          {status === 'draft' && (
                            <>
                              <button
                                type="button"
                                className="payroll-icon-button"
                                title="Edit draft"
                                aria-label={`Edit payroll for ${employeeName}`}
                                onClick={() => openEditForm(record)}
                                disabled={saving}
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                type="button"
                                className="payroll-icon-button payroll-approve-button"
                                title="Approve payroll"
                                aria-label={`Approve payroll for ${employeeName}`}
                                onClick={() => setRecordToApprove(record)}
                                disabled={saving}
                              >
                                <Check size={16} />
                              </button>
                            </>
                          )}

                          {status === 'approved' && (
                            <button
                              type="button"
                              className="payroll-icon-button payroll-paid-button"
                              title="Mark as paid"
                              aria-label={`Mark payroll paid for ${employeeName}`}
                              onClick={() => {
                                setPaymentData({
                                  paymentDate: new Date().toISOString().slice(0, 10),
                                  paymentReference: '',
                                })
                                setRecordToPay(record)
                              }}
                              disabled={saving}
                            >
                              <IndianRupee size={16} />
                            </button>
                          )}

                          {['draft', 'approved'].includes(status) && (
                            <button
                              type="button"
                              className="payroll-icon-button payroll-cancel-button"
                              title="Cancel payroll"
                              aria-label={`Cancel payroll for ${employeeName}`}
                              onClick={() => setRecordToCancel(record)}
                              disabled={saving}
                            >
                              <Ban size={15} />
                            </button>
                          )}
                          
<button
  type="button"
  className="payroll-icon-button payroll-delete-button"
  title="Delete payroll record"
  aria-label={`Delete payroll for ${employeeName}`}
  onClick={() => setRecordToDelete(record)}
  disabled={saving || deleting}
>
  <Trash2 size={16} />
</button>

                          {!['draft', 'approved'].includes(status) && (""
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
          className="payroll-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm()
          }}
        >
          <section
            className="payroll-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payroll-form-title"
          >
            <div className="payroll-modal-header">
              <div>
                <h2 id="payroll-form-title">
                  {editingRecord ? 'Edit Payroll Draft' : 'Create Payroll'}
                </h2>
                <p>
                  {editingRecord
                    ? 'Update salary components and notes.'
                    : 'Enter employee salary details for a pay period.'}
                </p>
              </div>

              <button
                type="button"
                className="payroll-icon-button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {formError && (
                <div className="payroll-alert payroll-alert-error" role="alert">
                  <AlertCircle size={18} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="payroll-form-grid">
                {!editingRecord && (
                  <>
                    <label className="payroll-form-full">
                      <span>Branch</span>
                      <select
                        name="branchId"
                        value={formData.branchId}
                        onChange={handleFormChange}
                        required
                        disabled={!canSelectBranch}
                      >
                        <option value="">Select branch</option>
                        {branches.map((branch) => (
                          <option key={getId(branch)} value={getId(branch)}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="payroll-form-full">
                      <span>Employee</span>
                      <select
  name="employeeId"
  value={formData.employeeId}
  onChange={handleFormChange}
  required
  disabled={!formData.branchId || employees.length === 0}
>
  <option value="">Select employee</option>

  {selectedEmployees.map((employee) => (
    <option key={getId(employee)} value={getId(employee)}>
      {employee.name} — {formatRole(employee.role)}
    </option>
  ))}
</select>

{formData.branchId && selectedEmployees.length === 0 && (
  <small className="payroll-field-help">
    No employees found in this branch.
  </small>
)}
                    </label>

                    <label>
                      <span>Pay year</span>
                      <select
                        name="year"
                        value={formData.year}
                        onChange={handleFormChange}
                        required
                      >
                        {years.map((year) => (
                          <option key={year} value={String(year)}>{year}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>Pay month</span>
                      <select
                        name="month"
                        value={formData.month}
                        onChange={handleFormChange}
                        required
                      >
                        {MONTHS.map((month, index) => (
                          <option key={month} value={String(index + 1)}>
                            {month}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}

                <label>
                  <span>Basic salary (₹)</span>
                  <input
                    type="number"
                    name="basicSalary"
                    value={formData.basicSalary}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    required
                  />
                </label>

                <label>
                  <span>Allowances (₹)</span>
                  <input
                    type="number"
                    name="allowances"
                    value={formData.allowances}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                  />
                </label>

                <label>
                  <span>Overtime pay (₹)</span>
                  <input
                    type="number"
                    name="overtimePay"
                    value={formData.overtimePay}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                  />
                </label>

                <label>
                  <span>Deductions (₹)</span>
                  <input
                    type="number"
                    name="deductions"
                    value={formData.deductions}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                  />
                </label>

                <div className="payroll-calculation payroll-form-full">
                  <div>
                    <span>Gross pay</span>
                    <strong>
                      {formatMoney(
                        (Number(formData.basicSalary) || 0) +
                        (Number(formData.allowances) || 0) +
                        (Number(formData.overtimePay) || 0),
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>Net pay</span>
                    <strong>
                      {formatMoney(
                        (Number(formData.basicSalary) || 0) +
                        (Number(formData.allowances) || 0) +
                        (Number(formData.overtimePay) || 0) -
                        (Number(formData.deductions) || 0),
                      )}
                    </strong>
                  </div>
                </div>

                <label className="payroll-form-full">
                  <span>Notes (optional)</span>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    rows="3"
                    maxLength={1000}
                    placeholder="Add payroll notes..."
                  />
                </label>
              </div>

              <div className="payroll-modal-actions">
                <button
                  type="button"
                  className="payroll-secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="payroll-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingRecord
                      ? 'Save changes'
                      : 'Create payroll'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {recordToApprove && (
        <div className="payroll-modal-backdrop">
          <section
            className="payroll-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="payroll-approve-title"
          >
            <span className="payroll-confirm-icon">
              <Check size={23} />
            </span>
            <h3 id="payroll-approve-title">Approve payroll?</h3>
            <p>
              Approve the payroll for <strong>{getName(recordToApprove.employee)}</strong>
              {' '}for {MONTHS[(Number(recordToApprove.payPeriod?.month) || 1) - 1]}
              {' '}{recordToApprove.payPeriod?.year}? Net pay is{' '}
              <strong>{formatMoney(recordToApprove.netPay)}</strong>.
            </p>
            <div className="payroll-modal-actions">
              <button
                type="button"
                className="payroll-secondary-button"
                onClick={() => setRecordToApprove(null)}
                disabled={saving}
              >
                Go back
              </button>
              <button
                type="button"
                className="payroll-primary-button"
                onClick={handleApprove}
                disabled={saving}
              >
                {saving ? 'Approving...' : 'Approve payroll'}
              </button>
            </div>
          </section>
        </div>
      )}

      {recordToPay && (
        <div className="payroll-modal-backdrop">
          <section
            className="payroll-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payroll-pay-title"
          >
            <div className="payroll-modal-header">
              <div>
                <h2 id="payroll-pay-title">Record Payroll Payment</h2>
                <p>
                  {getName(recordToPay.employee)} · {formatMoney(recordToPay.netPay)}
                </p>
              </div>
              <button
                type="button"
                className="payroll-icon-button"
                onClick={() => setRecordToPay(null)}
                disabled={saving}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleMarkPaid}>
              <div className="payroll-form-grid">
                <label className="payroll-form-full">
                  <span>Payment date</span>
                  <input
                    type="date"
                    value={paymentData.paymentDate}
                    onChange={(event) =>
                      setPaymentData((current) => ({
                        ...current,
                        paymentDate: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label className="payroll-form-full">
                  <span>Payment reference (optional)</span>
                  <input
                    type="text"
                    maxLength={100}
                    value={paymentData.paymentReference}
                    onChange={(event) =>
                      setPaymentData((current) => ({
                        ...current,
                        paymentReference: event.target.value,
                      }))
                    }
                    placeholder="Transaction ID or payment reference"
                  />
                </label>
              </div>

              <div className="payroll-modal-actions">
                <button
                  type="button"
                  className="payroll-secondary-button"
                  onClick={() => setRecordToPay(null)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="payroll-primary-button"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Confirm payment'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {recordToCancel && (
        <div className="payroll-modal-backdrop">
          <section
            className="payroll-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="payroll-cancel-title"
          >
            <span className="payroll-confirm-icon danger">
              <Ban size={23} />
            </span>
            <h3 id="payroll-cancel-title">Cancel payroll record?</h3>
            <p>
              Cancel the payroll for <strong>{getName(recordToCancel.employee)}</strong>?
              The record will remain in payroll history.
            </p>
            <div className="payroll-modal-actions">
              <button
                type="button"
                className="payroll-secondary-button"
                onClick={() => setRecordToCancel(null)}
                disabled={saving}
              >
                Keep record
              </button>
              <button
                type="button"
                className="payroll-danger-button"
                onClick={handleCancel}
                disabled={saving}
              >
                {saving ? 'Cancelling...' : 'Cancel payroll'}
              </button>
            </div>
            
          </section>
        </div>
      )}
      {recordToDelete && (
  <div
    className="payroll-modal-backdrop"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget && !deleting) {
        setRecordToDelete(null)
      }
    }}
  >
    <section
      className="payroll-confirm-modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="payroll-delete-title"
    >
      <span className="payroll-confirm-icon danger">
        <Trash2 size={23} />
      </span>

      <h3 id="payroll-delete-title">Delete payroll record?</h3>

      <p>
        Permanently delete the payroll record for{' '}
        <strong>{getName(recordToDelete.employee)}</strong>?
        This action cannot be undone.
      </p>

      <div className="payroll-modal-actions">
        <button
          type="button"
          className="payroll-secondary-button"
          onClick={() => setRecordToDelete(null)}
          disabled={deleting}
        >
          Keep record
        </button>

        <button
          type="button"
          className="payroll-danger-button"
          onClick={handleDeletePayroll}
          disabled={deleting}
        >
          {deleting ? 'Deleting...' : 'Delete payroll'}
        </button>
      </div>
    </section>
  </div>
)}
    </section>
  )
}
