
import { useState } from 'react'
import './auth.css'
import Logo from '../../assets/Logo1.png'
import login_banner from '../../assets/login_banner.jpeg'

const API_URL = 'http://localhost:5000/api'

export default function Login({ onLogin }) {
  const [accountType, setAccountType] = useState('staff')
  const [formMode, setFormMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function changeAccountType(type) {
    setAccountType(type)
    setFormMode('login')
    setName('')
    setEmail('')
    setPassword('')
    setError('')
    setShowPassword(false)
  }

  function changeFormMode(mode) {
    setFormMode(mode)
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (formMode === 'register' && name.trim().length < 2) {
      setError('Please enter your name.')
      return
    }

    if (!email.trim() || !password) {
      setError('Enter your email address and password.')
      return
    }

    if (formMode === 'register' && password.length < 8) {
      setError('Your password must be at least 8 characters.')
      return
    }

    setLoading(true)

    const endpoint =
      accountType === 'staff'
        ? '/auth/login'
        : formMode === 'register'
          ? '/auth/customer/register'
          : '/auth/customer/login'

    const body =
      formMode === 'register'
        ? { name: name.trim(), email: email.trim(), password }
        : { email: email.trim(), password }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Unable to continue. Please try again.')
      }

      if (!data.token || !data.user?.id || !data.user?.role) {
        throw new Error('The server returned an incomplete sign-in response.')
      }

      if (accountType === 'staff' && data.user.role === 'customer') {
        throw new Error('Please use the customer sign-in option.')
      }

      if (accountType === 'customer' && data.user.role !== 'customer') {
        throw new Error('This account is not a customer account.')
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

  const isRegistering = accountType === 'customer' && formMode === 'register'

  return (
    <main className="login-page">
      <div
        className="login-visual"
        style={{ backgroundImage: `url(${login_banner})` }}
        aria-hidden="true"
      />

      <section className="login-panel">
        <div className="login-panel-logo">
          <img className="login-logo" src={Logo} alt="ANOVA logo" />
        </div>

        <div className="login-form-wrap">
          <div className="auth-account-switch" aria-label="Account type">
            <button
              type="button"
              className={accountType === 'staff' ? 'auth-switch-active' : ''}
              onClick={() => changeAccountType('staff')}
              disabled={loading}
            >
              Staff Login
            </button>
            <button
              type="button"
              className={accountType === 'customer' ? 'auth-switch-active' : ''}
              onClick={() => changeAccountType('customer')}
              disabled={loading}
            >
              Customer
            </button>
          </div>

          <div className="form-heading">
            <span className="eyebrow">
              {accountType === 'staff'
                ? ''
                : isRegistering
                  ? 'JOIN ANOVA'
                  : ''}
            </span>

            <h2>
              {accountType === 'staff'
                ? 'Sign in to your'
                : isRegistering
                  ? 'Create your'
                  : 'Welcome back to your'}
              {accountType === 'staff'
                ? ' workspace'
                : isRegistering
                  ? ' account'
                  : ' account'}
              
            </h2>

            <p>
              {accountType === 'staff'
                ? 'Sign in with your registered staff account.'
                : isRegistering
                  ? 'Create an account to get started as an ANOVA customer.'
                  : 'Sign in to continue to your customer space.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {isRegistering && (
              <>
                <label htmlFor="customer-name">Full name</label>
                <div className="input-wrap">
                  <input
                    id="customer-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your full name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={loading}
                    maxLength={100}
                    required
                  />
                </div>
              </>
            )}

            <label htmlFor="email">Email address</label>
            <div className="input-wrap">
              <span className="input-icon" aria-hidden="true">✉</span>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
                maxLength={254}
                required
              />
            </div>

            <div className="password-label">
              <label htmlFor="password">Password</label>
            </div>

            <div className="input-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                placeholder={isRegistering ? 'At least 8 characters' : 'Enter your password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
                maxLength={128}
                required
              />

              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                disabled={loading}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {error && (
              <div className="form-error" role="alert">
                <span aria-hidden="true">!</span>
                {error}
              </div>
            )}

            <button className="sign-in-button" type="submit" disabled={loading}>
              {loading
                ? isRegistering
                  ? 'Creating account…'
                  : 'Signing in…'
                : isRegistering
                  ? 'Create customer account'
                  : 'Sign in'}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          {accountType === 'customer' && (
            <p className="auth-mode-switch">
              {isRegistering ? 'Already have an account?' : 'New to ANOVA?'}{' '}
              <button
                type="button"
                onClick={() => changeFormMode(isRegistering ? 'login' : 'register')}
                disabled={loading}
              >
                {isRegistering ? 'Sign in' : 'Create account'}
              </button>
            </p>
          )}

        
        </div>

        
      </section>
    </main>
  )
}
