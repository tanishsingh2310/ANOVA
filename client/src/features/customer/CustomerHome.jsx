import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client.js'
import './customer.css'

function formatPrice(price) {
  const amount = Number(price)
  if (!Number.isFinite(amount)) return 'Price unavailable'

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatAddress(address) {
  if (!address) return ''

  if (typeof address === 'string') return address

  return [
    address.street,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(', ')
}

export default function CustomerHome({ user, onLogout }) {
  const displayName = user?.name || 'Customer'

  const [branches, setBranches] = useState([])
  const [branchesLoading, setBranchesLoading] = useState(true)
  const [branchesError, setBranchesError] = useState('')
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [menuItems, setMenuItems] = useState([])
  const [menuLoading, setMenuLoading] = useState(false)
  const [menuError, setMenuError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadBranches() {
      setBranchesLoading(true)
      setBranchesError('')

      try {
        const response = await apiClient('/api/branches/public')
        const availableBranches = Array.isArray(response?.branches)
          ? response.branches
          : []

        if (cancelled) return

        setBranches(availableBranches)
        setSelectedBranchId((currentId) => {
          if (
            currentId &&
            availableBranches.some((branch) => branch._id === currentId)
          ) {
            return currentId
          }

          return availableBranches[0]?._id || ''
        })
      } catch (error) {
        if (!cancelled) {
          setBranchesError(
            error.message || 'Unable to load restaurant branches.',
          )
        }
      } finally {
        if (!cancelled) setBranchesLoading(false)
      }
    }

    loadBranches()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedBranchId) {
      setMenuItems([])
      setMenuError('')
      setMenuLoading(false)
      return undefined
    }

    let cancelled = false

    async function loadMenu() {
      setMenuLoading(true)
      setMenuError('')
      setMenuItems([])

      try {
        const response = await apiClient(
          `/api/menu/${encodeURIComponent(selectedBranchId)}`,
        )

        if (cancelled) return

        if (!Array.isArray(response)) {
          throw new Error('The menu response was not in the expected format.')
        }

        setMenuItems(response)
      } catch (error) {
        if (!cancelled) {
          setMenuError(error.message || 'Unable to load this branch menu.')
        }
      } finally {
        if (!cancelled) setMenuLoading(false)
      }
    }

    loadMenu()

    return () => {
      cancelled = true
    }
  }, [selectedBranchId])

  const selectedBranch = branches.find(
    (branch) => branch._id === selectedBranchId,
  )

  return (
    <main className="customer-page">
      <header className="customer-header">
        <div className="customer-brand">
          <span className="customer-brand-mark">A</span>
          <div>
            <strong>ANOVA</strong>
            <span>THE ART OF INTELLIGENT HOSPITALITY</span>
          </div>
        </div>

        <button
          className="customer-signout"
          type="button"
          onClick={onLogout}
        >
          Sign out
        </button>
      </header>

      <section className="customer-content">
        <span className="eyebrow">YOUR ANOVA ACCOUNT</span>
        <h1>Welcome, {displayName}.</h1>
        <p className="customer-intro">
          Discover a branch and explore its current menu.
        </p>

        <section className="customer-card">
          <div className="customer-card-symbol" aria-hidden="true">A</div>
          <div>
            <h2>Your customer account</h2>
            <p>
              You&apos;re signed in as <strong>{user?.email}</strong>.
            </p>
            <p className="customer-status">Account access active</p>
          </div>
        </section>

        <section className="customer-discovery" aria-labelledby="branches-title">
          <div className="customer-section-heading">
            <span className="eyebrow">EXPLORE ANOVA</span>
            <h2 id="branches-title">Restaurant branches</h2>
            <p>Select a branch to see its menu.</p>
          </div>

          {branchesLoading && (
            <p className="customer-feedback" role="status">
              Loading available branches…
            </p>
          )}

          {!branchesLoading && branchesError && (
            <div className="customer-feedback customer-feedback-error" role="alert">
              <p>{branchesError}</p>
              <button
                type="button"
                className="customer-retry"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          )}

          {!branchesLoading && !branchesError && branches.length === 0 && (
            <p className="customer-feedback">
              No active branches are available right now.
            </p>
          )}

          {!branchesLoading && !branchesError && branches.length > 0 && (
            <>
              <div className="customer-branch-list">
                {branches.map((branch) => (
                  <button
                    className={`customer-branch-option ${
                      branch._id === selectedBranchId
                        ? 'customer-branch-option-active'
                        : ''
                    }`}
                    key={branch._id}
                    type="button"
                    aria-pressed={branch._id === selectedBranchId}
                    onClick={() => setSelectedBranchId(branch._id)}
                  >
                    <span className="customer-branch-name">{branch.name}</span>
                    {formatAddress(branch.address) && (
                      <span className="customer-branch-address">
                        {formatAddress(branch.address)}
                      </span>
                    )}
                    {branch.phone && (
                      <span className="customer-branch-phone">
                        {branch.phone}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <section className="customer-menu" aria-labelledby="menu-title">
                <div className="customer-section-heading">
                  <span className="eyebrow">THE MENU</span>
                  <h2 id="menu-title">
                    {selectedBranch?.name || 'Branch menu'}
                  </h2>
                </div>

                {menuLoading && (
                  <p className="customer-feedback" role="status">
                    Loading menu…
                  </p>
                )}

                {!menuLoading && menuError && (
                  <p className="customer-feedback customer-feedback-error" role="alert">
                    {menuError}
                  </p>
                )}

                {!menuLoading && !menuError && menuItems.length === 0 && (
                  <p className="customer-feedback">
                    No menu items are listed for this branch yet.
                  </p>
                )}

                {!menuLoading && !menuError && menuItems.length > 0 && (
                  <div className="customer-menu-grid">
                    {menuItems.map((item) => (
                      <article className="customer-menu-item" key={item._id}>
                        {item.image && (
                          <img
                            className="customer-menu-image"
                            src={item.image}
                            alt={item.name || 'Menu item'}
                            loading="lazy"
                          />
                        )}

                        <div className="customer-menu-item-body">
                          <div className="customer-menu-item-topline">
                            <h3>{item.name}</h3>
                            <span className="customer-menu-price">
                              {formatPrice(item.price)}
                            </span>
                          </div>

                          {item.category && (
                            <p className="customer-menu-category">
                              {item.category}
                            </p>
                          )}

                          {item.description && (
                            <p className="customer-menu-description">
                              {item.description}
                            </p>
                          )}

                          {item.dietary && (
                            <p className="customer-menu-detail">
                              Dietary: {item.dietary}
                            </p>
                          )}

                          <p
                            className={`customer-menu-availability ${
                              item.available
                                ? 'customer-menu-available'
                                : 'customer-menu-unavailable'
                            }`}
                          >
                            {item.available ? 'Available' : 'Currently unavailable'}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </section>

        <p className="customer-footnote">
          Menu information is loaded from the selected branch.
        </p>
      </section>
    </main>
  )
}