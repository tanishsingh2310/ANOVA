import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

const STATISTICS = [
  {
    key: 'staff',
    label: 'Total Staff',
    icon: 'users',
    description: 'Including owners and admins',
    color: 'green',
  },
  {
    key: 'branches',
    label: 'Total Branches',
    icon: 'git-branch',
    description: 'Across the organization',
    color: 'gold',
  },
  {
    key: 'menuItems',
    label: 'Menu Items',
    icon: 'utensils',
    description: 'Across all branches',
    color: 'sage',
  },
  {
    key: 'reservations',
    label: 'Reservations',
    icon: 'calendar-check',
    description: 'All recorded reservations',
    color: 'blue',
  },
  {
    key: 'orders',
    label: 'Total Orders',
    icon: 'shopping-bag',
    description: 'All recorded orders',
    color: 'purple',
  },
  {
    key: 'tables',
    label: 'Total Tables',
    icon: 'layout-grid',
    description: 'Across all branches',
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

export default function DashboardStatistics() {
  const [totals, setTotals] = useState(INITIAL_TOTALS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadStatistics() {
      setLoading(true)
      setError('')

      try {
        // These paths must match the existing API client's conventions.
        // Verify response shapes and authorization before using the results.
        const results = await Promise.allSettled([
          apiClient.get('/employees'),
          apiClient.get('/branches'),
          apiClient.get('/menu'),
          apiClient.get('/reservations'),
          apiClient.get('/orders'),
          apiClient.get('/tables'),
        ])

        if (cancelled) return

        const nextTotals = { ...INITIAL_TOTALS }
        const failed = []

        const getRows = (response) => {
          const data = response?.data

          if (Array.isArray(data)) return data
          if (Array.isArray(data?.data)) return data.data
          if (Array.isArray(data?.items)) return data.items
          if (Array.isArray(data?.employees)) return data.employees
          if (Array.isArray(data?.branches)) return data.branches
          if (Array.isArray(data?.menuItems)) return data.menuItems
          if (Array.isArray(data?.reservations)) return data.reservations
          if (Array.isArray(data?.orders)) return data.orders
          if (Array.isArray(data?.tables)) return data.tables

          return null
        }

        const keys = [
          'staff',
          'branches',
          'menuItems',
          'reservations',
          'orders',
          'tables',
        ]

        results.forEach((result, index) => {
          const key = keys[index]

          if (result.status !== 'fulfilled') {
            failed.push(key)
            return
          }

          const rows = getRows(result.value)

          if (!rows) {
            failed.push(key)
            return
          }

          if (key === 'staff') {
            const excludedRoles = ['owner', 'customer']
            nextTotals.staff = rows.filter((person) => {
              const role = String(person.role || '').toLowerCase()
              const active = person.isActive ?? person.active ?? true

              return !excludedRoles.includes(role) && active !== false
            }).length
          } else {
            nextTotals[key] = rows.length
          }
        })

        setTotals(nextTotals)

        if (failed.length) {
          setError(
            `Some statistics could not be loaded: ${failed.join(', ')}. Check the existing API routes and response formats.`
          )
        }
      } catch {
        if (!cancelled) {
          setError('Statistics could not be loaded. Please try again.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadStatistics()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="dashboard-statistics" aria-labelledby="statistics-title">
      <div className="statistics-heading">
        <div>
          <span className="statistics-eyebrow">AT A GLANCE</span>
          <h2 id="statistics-title">Organization Overview</h2>
        </div>

        <span className="statistics-period">All branches</span>
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
              {loading
                ? '—'
                : totals[stat.key] === null
                  ? '—'
                  : totals[stat.key].toLocaleString()}
            </div>

            <p className="statistics-description">{stat.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}