
import { useState } from 'react'
import Login from '../features/auth/Login.jsx'
import Dashboard from '../features/dashboard/Dashboard.jsx'
import CustomerHome from '../features/customer/CustomerHome.jsx'

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

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  if (user.role === 'customer') {
    return <CustomerHome user={user} onLogout={handleLogout} />
  }

  return <Dashboard user={user} onLogout={handleLogout} />
}
