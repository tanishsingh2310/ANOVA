import { useState } from 'react';

const navigationSections = [
  {
    title: 'Overview',
    items: [
      { id: 'dashboard', label: 'Executive Dashboard' }
    ]
  },
  {
    title: 'Inventory & Supply Chain',
    items: [
      { id: 'inv-dashboard', label: 'Inventory Overview' },
      { id: 'inv-ingredients', label: 'Ingredients & Stock' },
      { id: 'inv-suppliers', label: 'Supplier Directory' },
      { id: 'inv-orders', label: 'Purchase Orders & GRN' },
      { id: 'inv-transfers', label: 'Branch Transfers' },
      { id: 'inv-wastage', label: 'Wastage & Spoilage' },
      { id: 'inv-reports', label: 'Valuation & Reports' }
    ]
  },
  {
    title: 'Restaurant Operations',
    items: [
      { id: 'ops-menu', label: 'Menu Management' },
      { id: 'ops-tables', label: 'Table Management' },
      { id: 'ops-reservations', label: 'Reservations' },
      { id: 'ops-orders', label: 'Orders & POS' },
      { id: 'ops-kitchen', label: 'Kitchen Workflow' },
      { id: 'ops-billing', label: 'Billing & Payments' },
      { id: 'ops-recommendations', label: 'Food Recommendations' }
    ]
  },
  {
    title: 'Other Modules',
    items: [
      { id: 'core-admin', label: 'Administration' },
      { id: 'core-branches', label: 'Branches & Locations' },
      { id: 'core-staff', label: 'Staff & Roles' },
      { id: 'cust-management', label: 'Customer Management' }
    ]
  }
];

export default function Sidebar({ activePage, setActivePage, alertsCount = 0 }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (id) => {
    setActivePage(id);
    setMobileOpen(false);
  };

  return (
    <aside className="anova-sidebar">
      <div className="anova-sidebar-header">
        <div
          className="anova-sidebar-brand"
          onClick={() => handleNav('inv-dashboard')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNav('inv-dashboard'); }}
          title="ANOVA — The Art of Intelligent Hospitality"
        >
          <div className="anova-brand-logo-container">
            <img
              src="/anova-emblem.png"
              alt="Anova"
              className="anova-brand-logo"
            />
          </div>

          <div className="anova-brand-details">
            <h1>Anova</h1>
            <p>The Art of Intelligent Hospitality</p>
          </div>
        </div>

        <button
          type="button"
          className="anova-mobile-menu-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close Menu' : 'Open Menu'}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      <nav className={`anova-sidebar-nav ${mobileOpen ? 'is-open' : ''}`} aria-label="Main navigation">
        {navigationSections.map((section) => (
          <div className="anova-nav-section" key={section.title}>
            <p className="anova-nav-heading">{section.title}</p>
            {section.items.map((item) => {
              const isActive = activePage === item.id;
              const hasAlert = item.id === 'inv-ingredients' && alertsCount > 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`anova-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleNav(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span>{item.label}</span>
                  {hasAlert && <span className="anova-nav-badge">{alertsCount}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="anova-sidebar-footer">
        <p>ANOVA MANAGEMENT SYSTEM</p>
        <span>Enterprise Edition</span>
      </div>
    </aside>
  );
}
