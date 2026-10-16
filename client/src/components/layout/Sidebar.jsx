import { useState } from 'react';
import logoImg from '../../assets/logo.png';

const navigationSections = [
  {
    title: 'Overview',
    items: [
      { id: 'dashboard', label: 'Executive Dashboard', icon: '📊' }
    ]
  },
  {
    title: 'Inventory & Supply Chain',
    items: [
      { id: 'inv-dashboard', label: 'Inventory Overview', icon: '📦' },
      { id: 'inv-ingredients', label: 'Ingredients & Stock', icon: '🥬' },
      { id: 'inv-suppliers', label: 'Supplier Directory', icon: '🚚' },
      { id: 'inv-orders', label: 'Purchase Orders & GRN', icon: '📝' },
      { id: 'inv-transfers', label: 'Branch Transfers', icon: '🔄' },
      { id: 'inv-wastage', label: 'Wastage & Spoilage', icon: '🗑️' },
      { id: 'inv-reports', label: 'Valuation & Reports', icon: '📈' }
    ]
  },
  {
    title: 'Restaurant Operations',
    items: [
      { id: 'ops-menu', label: 'Menu Management', icon: '🍽️' },
      { id: 'ops-tables', label: 'Table Management', icon: '🪑' },
      { id: 'ops-reservations', label: 'Reservations', icon: '📅' },
      { id: 'ops-orders', label: 'Orders & POS', icon: '🧾' },
      { id: 'ops-kitchen', label: 'Kitchen Workflow', icon: '👨‍🍳' },
      { id: 'ops-billing', label: 'Billing & Payments', icon: '💳' }
    ]
  },
  {
    title: 'Enterprise Management',
    items: [
      { id: 'core-branches', label: 'Branches & Locations', icon: '🏢' },
      { id: 'core-staff', label: 'Staff & Roles', icon: '👥' },
      { id: 'cust-management', label: 'Customer Management', icon: '🌟' }
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
          title="ANOVA — Advanced Networked Operations, Visibility & Administration"
        >
          <img
            src={logoImg}
            alt="ANOVA — Smarter Operations. Greater Hospitality."
            className="anova-brand-logo-img"
          />
          <h1 className="sr-only">ANOVA — Smarter Operations. Greater Hospitality.</h1>
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
            <div className="anova-nav-heading">{section.title}</div>
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
                  <span style={{ fontSize: '15px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                  {hasAlert && <span className="anova-nav-badge">{alertsCount}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="anova-sidebar-footer">
        <p>ANOVA MBREMS</p>
        <span>Enterprise v1.2 • Branch Ready</span>
      </div>
    </aside>
  );
}
