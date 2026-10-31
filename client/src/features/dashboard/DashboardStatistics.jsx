import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

const STATISTICS = [
  {
    key: 'staff',
    label: 'Total Staff',
    icon: 'users',
    description: 'Including owners and admins',
    branchDescription: 'Assigned to selected branch',
    color: 'green',
  },
  {
    key: 'branches',
    label: 'Total Branches',
    icon: 'git-branch',
    description: 'Across the organization',
    branchDescription: 'Across the organization',
    color: 'gold',
  },
  {
    key: 'menuItems',
    label: 'Menu Items',
    icon: 'utensils',
    description: 'Across all branches',
    branchDescription: 'Available at selected branch',
    color: 'sage',
  },
  {
    key: 'reservations',
    label: 'Reservations',
    icon: 'calendar-check',
    description: 'All recorded reservations',
    branchDescription: 'At selected branch',
    color: 'blue',
  },
  {
    key: 'orders',
    label: 'Total Orders',
    icon: 'shopping-bag',
    description: 'All recorded orders',
    branchDescription: 'At selected branch',
    color: 'purple',
  },
  {
    key: 'tables',
    label: 'Total Tables',
    icon: 'layout-grid',
    description: 'Across all branches',
    branchDescription: 'At selected branch',
    color: 'orange',
  },
]

const INITIAL_TOTALS = {
  staff: null,
  branches: null,
  menuItems: null,
  reservations: null,
  orders: null,
  tables: null,
}

export default function DashboardStatistics({
  selectedBranch = 'all',
  branches = [],
  onBranchChange,
}) {
  const [totals, setTotals] = useState(INITIAL_TOTALS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [internalBranches, setInternalBranches] = useState(branches || [])

  const availableBranches = branches?.length ? branches : internalBranches

  // If branches prop was not provided, load branches list for selector
  useEffect(() => {
    if (branches && branches.length > 0) return

    let cancelled = false
    async function fetchBranches() {
      try {
        const data = await apiClient('/api/branches')
        if (cancelled) return
        const list = Array.isArray(data?.branches)
          ? data.branches
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : []
        setInternalBranches(list)
      } catch (err) {
        console.warn('Failed to load branches for statistics selector:', err.message)
      }
    }

    fetchBranches()
    return () => {
      cancelled = true
    }
  }, [branches])

  const loadStatistics = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const branchQuery =
        selectedBranch && selectedBranch !== 'all'
          ? `?branchId=${encodeURIComponent(selectedBranch)}`
          : ''

      const response = await apiClient(`/api/reports/statistics${branchQuery}`)

      if (response?.success && response?.totals) {
        setTotals({
          staff: typeof response.totals.staff === 'number' ? response.totals.staff : null,
          branches: typeof response.totals.branches === 'number' ? response.totals.branches : null,
          menuItems: typeof response.totals.menuItems === 'number' ? response.totals.menuItems : null,
          reservations: typeof response.totals.reservations === 'number' ? response.totals.reservations : null,
          orders: typeof response.totals.orders === 'number' ? response.totals.orders : null,
          tables: typeof response.totals.tables === 'number' ? response.totals.tables : null,
        })

        if (response.failed && response.failed.length > 0) {
          setError(
            `Some statistics could not be loaded: ${response.failed.join(', ')}. Please try again.`
          )
        }
      } else {
        throw new Error(response?.message || 'Invalid statistics response.')
      }
    } catch {
      setError('Statistics could not be loaded. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [selectedBranch])

  useEffect(() => {
    loadStatistics()

    // Synchronize whenever user revisits or tab regains focus, or on mutation events
    const handleSync = () => {
      loadStatistics()
    }

    window.addEventListener('focus', handleSync)
    window.addEventListener('anova_records_updated', handleSync)
    window.addEventListener('anova_branches_updated', handleSync)

    return () => {
      window.removeEventListener('focus', handleSync)
      window.removeEventListener('anova_records_updated', handleSync)
      window.removeEventListener('anova_branches_updated', handleSync)
    }
  }, [loadStatistics])

  const handleBranchSelect = (event) => {
    const nextBranchId = event.target.value
    if (onBranchChange) {
      onBranchChange(nextBranchId)
    }
  }

  return (
    <section className="dashboard-statistics" aria-labelledby="statistics-title">
      <div className="statistics-heading">
        <div>
          <span className="statistics-eyebrow">AT A GLANCE</span>
          <h2 id="statistics-title">Organization Overview</h2>
        </div>

        <select
          id="overview-branch-filter"
          className="statistics-period"
          aria-label="Filter overview by branch"
          value={selectedBranch || 'all'}
          onChange={handleBranchSelect}
        >
          <option value="all">All branches</option>
          {availableBranches.map((branch) => {
            const id = branch._id || branch.id
            return (
              <option key={id} value={id}>
                {branch.name}
              </option>
            )
          })}
        </select>
      </div>

      {error && (
        <div className="statistics-error" role="status">
          {error}
        </div>
      )}

      <div className="statistics-grid">
        {STATISTICS.map((stat) => (
          <article
            className={`statistics-card statistics-${stat.color}`}
            key={stat.key}
          >
            <div className="statistics-card-top">
              <span className="statistics-icon" aria-hidden="true">
                {stat.icon === 'users' && '♙'}
                {stat.icon === 'git-branch' && '⑂'}
                {stat.icon === 'utensils' && '♨'}
                {stat.icon === 'calendar-check' && '▦'}
                {stat.icon === 'shopping-bag' && '▣'}
                {stat.icon === 'layout-grid' && '▦'}
              </span>
              <span className="statistics-label">{stat.label}</span>
            </div>

            <div className="statistics-value" aria-live="polite">
              {loading ? (
                <span className="statistics-loading-dots" aria-label="Loading statistic">···</span>
              ) : typeof totals[stat.key] === 'number' ? (
                totals[stat.key].toLocaleString()
              ) : (
                '—'
              )}
            </div>

            <p className="statistics-description">
              {selectedBranch && selectedBranch !== 'all'
                ? stat.branchDescription
                : stat.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}