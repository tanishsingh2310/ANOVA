import { Component, useState } from 'react'
import Login from '../features/auth/Login.jsx'
import Dashboard from '../features/dashboard/Dashboard.jsx'
import CustomerHome from '../features/customer/CustomerHome.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Crash caught by ErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#721c24', background: '#f8d7da', margin: '2rem', borderRadius: '8px' }}>
          <h2>Application Render Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px', background: '#fff', padding: '1rem', borderRadius: '4px', border: '1px solid #f5c6cb' }}>
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={() => {
              sessionStorage.clear()
              window.location.reload()
            }}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#721c24', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Clear Session & Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const TOKEN_KEY = 'mbrems_token'
const USER_KEY = 'mbrems_user'

function readStoredUser() {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY)
    const storedUser = sessionStorage.getItem(USER_KEY)

    if (!token || !storedUser) return null

    const user = JSON.parse(storedUser)

    if (!user || typeof user.id !== 'string' || typeof user.role !== 'string') {
      sessionStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem(USER_KEY)
      return null
    }

    return user
  } catch {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    return null
  }
}

export default function App() {
  const [user, setUser] = useState(readStoredUser)

  function handleLogin(data) {
    if (!data?.token || !data?.user?.id || !data?.user?.role) {
      return
    }

    sessionStorage.setItem(TOKEN_KEY, data.token)
    sessionStorage.setItem(USER_KEY, JSON.stringify(data.user))
    setUser(data.user)
  }

  function handleLogout() {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    setUser(null)
  }

  let content
  if (!user) {
    content = <Login onLogin={handleLogin} />
  } else if (user.role === 'customer') {
    content = <CustomerHome user={user} onLogout={handleLogout} />
  } else {
    content = <Dashboard user={user} onLogout={handleLogout} />
  }

  return <ErrorBoundary>{content}</ErrorBoundary>
}
