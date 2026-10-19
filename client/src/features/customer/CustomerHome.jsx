
import './customer.css'

export default function CustomerHome({ user, onLogout }) {
  const displayName = user?.name || 'Customer'

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
          Your customer space is ready. We’re building a more connected
          restaurant experience for you.
        </p>

        <section className="customer-card">
          <div className="customer-card-symbol" aria-hidden="true">A</div>
          <div>
            <h2>Your customer account</h2>
            <p>
              You’re signed in as <strong>{user?.email}</strong>.
            </p>
            <p className="customer-status">Account access active</p>
          </div>
        </section>

        <p className="customer-footnote">
          Restaurant discovery, reservations, and order features can be
          connected here in a future step.
        </p>
      </section>
    </main>
  )
}
