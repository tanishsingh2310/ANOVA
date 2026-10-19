
import { useState } from 'react'
import './dashboard.css'

const navigation = [
  { label: 'Overview', icon: '◫', roles: ['owner', 'admin', 'manager', 'hr', 'employee'] },
  { label: 'Branches', icon: '⌂', roles: ['owner', 'admin', 'manager', 'hr', 'inventory_manager', 'chef', 'cashier', 'employee'] },
  { label: 'Employees', icon: '♙', roles: ['owner', 'admin', 'manager', 'hr'] },
  { label: 'Shifts', icon: '◷', roles: ['owner', 'admin', 'manager', 'hr', 'employee'] },
  { label: 'Attendance', icon: '✓', roles: ['owner', 'admin', 'manager', 'hr', 'employee'] },
  { label: 'Leave requests', icon: '▤', roles: ['owner', 'admin', 'manager', 'hr', 'employee'] },
  { label: 'Payroll', icon: '₹', roles: ['owner', 'admin', 'hr'] },
]

const modules = [
  {
    title: 'Branches',
    description: 'Manage restaurant locations and branch information.',
    icon: '⌂',
    tone: 'green',
  },
  {
    title: 'Employees',
    description: 'View team members, roles and employment details.',
    icon: '♙',
    tone: 'gold',
  },
  {
    title: 'Shifts',
    description: 'Organise staff schedules and shift assignments.',
    icon: '◷',
    tone: 'blue',
  },
  {
    title: 'Attendance',
    description: 'Review attendance records and working hours.',
    icon: '✓',
    tone: 'green',
  },
  {
    title: 'Leave requests',
    description: 'Review and manage employee leave requests.',
    icon: '▤',
    tone: 'gold',
  },
  {
    title: 'Payroll',
    description: 'Access payroll operations and salary records.',
    icon: '₹',
    tone: 'blue',
  },
]

export default function Dashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState('Overview')
  const [mobileMenu, setMobileMenu] = useState(false)

  const visibleNavigation = navigation.filter((item) =>
    item.roles.includes(user?.role),
  )

  const displayName = user?.name || user?.email || 'Team member'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  function selectPage(label) {
    setActivePage(label)
    setMobileMenu(false)
  }

  return (
    <div className="app-layout">
      {mobileMenu && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">A</div>
          <div>
            <div className="brand">ANOVA</div>
            <div className="workspace-label">RESTAURANT MANAGEMENT</div>
          </div>
        </div>

        <div className="side-nav">
          <div className="side-nav-label">WORKSPACE</div>
          {visibleNavigation.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${activePage === item.label ? 'nav-active' : ''}`}
              onClick={() => selectPage(item.label)}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {activePage === item.label && <span className="nav-indicator" />}
            </button>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <div className="help-symbol">✳</div>
            <div>
              <strong>Need assistance?</strong>
              <p>Your workspace, thoughtfully managed.</p>
            </div>
          </div>
          <div className="sidebar-version">ANOVA · MANAGEMENT SUITE</div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button
            className="menu-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenu}
            onClick={() => setMobileMenu((open) => !open)}
          >
            ☰
          </button>

          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-user">
            <div className="user-avatar">{initials || 'U'}</div>
            <div className="user-details">
              <strong>{displayName}</strong>
              <span>{user?.role || 'Team member'}</span>
            </div>
            <button className="logout-button" onClick={onLogout}>
              Sign out
            </button>
          </div>
        </header>

        <div className="page-content">
          <div className="page-intro">
            <div>
              <div className="eyebrow">YOUR RESTAURANT WORKSPACE</div>
              <h1>{activePage === 'Overview' ? 'A clearer view of your business.' : activePage}</h1>
              <p>
                {activePage === 'Overview'
                  ? 'Everything your team needs to keep hospitality running smoothly.'
                  : `Manage ${activePage.toLowerCase()} from your ANOVA workspace.`}
              </p>
            </div>
            <div className="heading-period">
              <span className="live-dot" />
              Workspace active
            </div>
          </div>

          {activePage === 'Overview' ? (
            <>
              <section className="welcome-banner">
                <div className="banner-content">
                  <div className="banner-label">WELCOME TO ANOVA</div>
                  <h2>Good hospitality starts with a well-connected team.</h2>
                  <p>
                    Keep your people, schedules and restaurant operations
                    organised in one place.
                  </p>
                </div>
                <div className="banner-mark" aria-hidden="true">A</div>
              </section>

              <div className="section-heading">
                <div>
                  <h2>Your workspace</h2>
                  <p>Choose an area to get started.</p>
                </div>
              </div>

              <section className="module-grid">
                {modules
                  .filter((module) =>
                    visibleNavigation.some((item) => item.label === module.title),
                  )
                  .map((module) => (
                    <button
                      className="module-card"
                      key={module.title}
                      onClick={() => selectPage(module.title)}
                    >
                      <div className={`module-icon module-tone-${module.tone}`}>
                        {module.icon}
                      </div>
                      <div className="module-title">{module.title}</div>
                      <p className="module-description">{module.description}</p>
                      <div className="module-arrow" aria-hidden="true">↗</div>
                    </button>
                  ))}
              </section>

              <div className="data-notice">
                <span className="notice-icon">i</span>
                <p>
                  Your workspace is ready. Operational data will appear here
                  when the corresponding modules are connected.
                </p>
              </div>
            </>
          ) : (
            <section className="module-placeholder">
              <div className="placeholder-icon">✳</div>
              <h2>{activePage}</h2>
              <p>
                This section is ready for its module interface. The next step
                is to connect it to the existing backend API.
              </p>
              <button
                className="secondary-button"
                onClick={() => selectPage('Overview')}
              >
                Back to overview
              </button>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
