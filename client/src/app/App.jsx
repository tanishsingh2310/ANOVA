import { useEffect, useState } from 'react'
import './App.css'

const API_URL = 'http://localhost:5000/api'

const navigation = [
  { label: 'Overview', icon: '◫', roles: ['owner', 'admin', 'manager', 'hr', 'employee'] },
  { label: 'Branches', icon: '⌂', roles: ['owner', 'admin', 'manager', 'hr', 'inventory_manager', 'chef', 'cashier', 'employee'] },
  { label: 'Employees', icon: '♙', roles: ['owner', 'admin', 'manager', 'hr'] },
  { label: 'Shifts', icon: '◷', roles: ['owner', 'admin', 'manager', 'hr', 'employee'] },
  { label: 'Attendance', icon: '✓', roles: ['owner', 'admin', 'manager', 'hr', 'employee'] },
  { label: 'Leave requests', icon: '▤', roles: ['owner', 'admin', 'manager', 'hr', 'employee'] },
  { label: 'Payroll', icon: '₹', roles: ['owner', 'admin', 'hr'] },
]

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Enter your email address and password.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Unable to sign in. Please try again.')
      }

      if (!data.token || !data.user?.id) {
        throw new Error('The server returned an incomplete login response.')
      }

      onLogin(data)
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot connect to the server. Check that the backend is running.'
          : err.message || 'Something went wrong. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="visual-top">
          <div className="brand brand-light">
            <span className="brand-mark">A</span>
            <span>ANOVA</span>
          </div>
          <span className="visual-label">RESTAURANT OPERATIONS</span>
        </div>

        <div className="visual-content">
          <span className="eyebrow"><span className="live-dot" /> ONE CONNECTED ENTERPRISE</span>
          <h1>Great restaurants<br />run on <em>great teams.</em></h1>
          <p>One place to manage your branches, people, schedules, attendance and payroll.</p>

          <div className="visual-card">
            <div className="visual-card-top">
              <div>
                <span className="muted-label">YOUR WORKSPACE</span>
                <h3>Restaurant operations</h3>
              </div>
              <span className="card-symbol">✳</span>
            </div>
            <div className="mini-stats">
              <div><span className="stat-symbol">⌂</span><span>Branches</span></div>
              <div><span className="stat-symbol">♙</span><span>People</span></div>
              <div><span className="stat-symbol">◷</span><span>Schedules</span></div>
            </div>
            <div className="visual-card-footer">
              <span className="status-pill"><span /> Connected workspace</span>
              <span>ANOVA · MBREMS</span>
            </div>
          </div>
        </div>

        <p className="visual-footer">THOUGHTFUL OPERATIONS. BETTER HOSPITALITY.</p>
      </section>

      <section className="login-panel">
        <div className="mobile-brand brand">
          <span className="brand-mark">A</span><span>ANOVA</span>
        </div>

        <div className="login-form-wrap">
          <div className="form-heading">
            <span className="eyebrow">WELCOME BACK</span>
            <h2>Sign in to your<br />workspace<span className="heading-period">.</span></h2>
            <p>Use your registered account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="email">Email address</label>
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true">✉</span>
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="password-label">
              <label htmlFor="password">Password</label>
            </div>
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true">⌑</span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
                required
              />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {error && (
              <div className="form-error" role="alert">
                <span aria-hidden="true">!</span>{error}
              </div>
            )}

            <button className="sign-in-button" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="secure-note"><span aria-hidden="true">◇</span> Secure access to your restaurant workspace</div>
        </div>

        <footer className="login-footer">
          <span>© {new Date().getFullYear()} ANOVA</span>
          <span>MBREMS · Enterprise Management</span>
        </footer>
      </section>
    </main>
  )
}

function Dashboard({ user, onLogout }) {
  const [activePage, setActivePage] = useState('Overview')
  const [mobileMenu, setMobileMenu] = useState(false)
  const visibleNavigation = navigation.filter((item) => item.roles.includes(user.role))

  useEffect(() => {
    if (!visibleNavigation.some((item) => item.label === activePage)) {
      setActivePage('Overview')
    }
  }, [user.role])

  return (
    <div className="app-layout">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand brand">
          <span className="brand-mark">A</span><span>ANOVA</span>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {visibleNavigation.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${activePage === item.label ? 'nav-active' : ''}`}
              onClick={() => { setActivePage(item.label); setMobileMenu(false) }}
            >
              <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
              {activePage === item.label && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <span className="help-symbol">?</span>
            <div><strong>Need assistance?</strong><span>Contact your administrator</span></div>
          </div>
          <div className="sidebar-version">ANOVA · MBREMS</div>
        </div>
      </aside>

      {mobileMenu && <button className="mobile-overlay" aria-label="Close menu" onClick={() => setMobileMenu(false)} />}

      <main className="main-panel">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setMobileMenu((value) => !value)} aria-label="Toggle navigation">☰</button>
          <div className="breadcrumb">Workspace <span>/</span> <strong>{activePage}</strong></div>
          <div className="topbar-user">
            <div className="user-avatar">{user.name?.charAt(0)?.toUpperCase() || 'U'}</div>
            <div className="user-details"><strong>{user.name}</strong><span>{user.role.replaceAll('_', ' ')}</span></div>
            <button className="logout-button" onClick={onLogout} title="Sign out" aria-label="Sign out">↪</button>
          </div>
        </header>

        <section className="page-content">
          <div className="page-intro">
            <span className="eyebrow">ANOVA WORKSPACE</span>
            <h1>{activePage === 'Overview' ? 'Good to have you here' : activePage}<span className="heading-period">.</span></h1>
            <p>
              {activePage === 'Overview'
                ? `Welcome back, ${user.name}. Your workspace is ready.`
                : `${activePage} workspace. Data and actions will be connected to the backend in the next implementation step.`}
            </p>
          </div>

          {activePage === 'Overview' ? (
            <>
              <div className="welcome-banner">
                <div>
                  <span className="banner-label">YOUR ROLE</span>
                  <h2>{user.role.replaceAll('_', ' ')}</h2>
                  <p>Your available workspace sections are listed below.</p>
                </div>
                <div className="banner-mark" aria-hidden="true">A</div>
              </div>
              <div className="section-heading"><div><h2>Your workspace</h2><p>Choose a section to get started.</p></div></div>
              <div className="module-grid">
                {visibleNavigation.filter((item) => item.label !== 'Overview').map((item, index) => (
                  <button className="module-card" key={item.label} onClick={() => setActivePage(item.label)}>
                    <span className={`module-icon module-tone-${index % 4}`}>{item.icon}</span>
                    <span className="module-title">{item.label}</span>
                    <span className="module-description">Open {item.label.toLowerCase()} workspace</span>
                    <span className="module-arrow">↗</span>
                  </button>
                ))}
              </div>
              <p className="data-notice">Live operational data will appear here once the module integrations are implemented.</p>
            </>
          ) : (
            <div className="module-placeholder">
              <span className="placeholder-icon">{visibleNavigation.find((item) => item.label === activePage)?.icon || '◫'}</span>
              <h2>{activePage}</h2>
              <p>This section is ready for integration with your MBREMS API.</p>
              <button className="secondary-button" onClick={() => setActivePage('Overview')}>Back to overview</button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function App() {
  const [session, setSession] = useState(() => {
    try {
      const token = sessionStorage.getItem('mbrems_token')
      const user = sessionStorage.getItem('mbrems_user')
      return token && user ? { token, user: JSON.parse(user) } : null
    } catch {
      return null
    }
  })

  function handleLogin(data) {
    const nextSession = { token: data.token, user: data.user }
    sessionStorage.setItem('mbrems_token', data.token)
    sessionStorage.setItem('mbrems_user', JSON.stringify(data.user))
    setSession(nextSession)
  }

  function handleLogout() {
    sessionStorage.removeItem('mbrems_token')
    sessionStorage.removeItem('mbrems_user')
    setSession(null)
  }

  return session
    ? <Dashboard user={session.user} onLogout={handleLogout} />
    : <Login onLogin={handleLogin} />
}

export default App
