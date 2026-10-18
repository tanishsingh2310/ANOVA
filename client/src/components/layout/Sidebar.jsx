import { useState } from 'react';
import { inventoryNavigation } from '../../modules/inventory';

const defaultNavigationSections = [
  {
    title: `${inventoryNavigation.title} (Member 2)`,
    items: inventoryNavigation.items
  },
  {
    title: 'Restaurant Operations (Member 3)',
    items: [
      { id: 'ext-menu', label: 'Menu & Recipes', owner: 'Member 3' },
      { id: 'ext-kitchen', label: 'Kitchen Workflow', owner: 'Member 3' },
      { id: 'ext-tables', label: 'Tables & Reservations', owner: 'Member 3' },
      { id: 'ext-billing', label: 'Billing & POS', owner: 'Member 3' }
    ]
  },
  {
    title: 'Core Administration & HR (Member 1)',
    items: [
      { id: 'ext-users', label: 'Users & Roles', owner: 'Member 1' },
      { id: 'ext-branches', label: 'Multi-Branch Admin', owner: 'Member 1' },
      { id: 'ext-hr', label: 'Staff & Payroll', owner: 'Member 1' },
      { id: 'ext-audit', label: 'System Audit Logs', owner: 'Member 1' }
    ]
  },
  {
    title: 'Customer Experience & BI (Member 4)',
    items: [
      { id: 'ext-customer', label: 'Online Ordering', owner: 'Member 4' },
      { id: 'ext-delivery', label: 'Delivery Dispatch', owner: 'Member 4' },
      { id: 'ext-analytics', label: 'Customer Analytics', owner: 'Member 4' }
    ]
  }
];

export default function Sidebar({
  activePage,
  setActivePage,
  alertsCount = 0,
  sections = defaultNavigationSections
}) {
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
        {sections.map((section) => (
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
