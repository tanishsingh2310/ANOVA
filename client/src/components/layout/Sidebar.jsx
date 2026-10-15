import { useState } from "react";

const navigation = [
  {
    title: "Overview",
    items: ["Dashboard"],
  },
  {
    title: "Restaurant Operations",
    items: [
      "Menu Management",
      "Table Management",
      "Reservations",
      "Orders",
      "Kitchen Workflow",
      "Billing & Payments",
      "Food Recommendations",
    ],
  },
  {
    title: "Other Modules",
    items: [
      "Administration",
      "Inventory",
      "Customer Management",
      "Reports & Analytics",
    ],
  },
];

function Sidebar({ activePage, setActivePage }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function handleNavigation(item) {
    setActivePage(item);
    setIsMobileMenuOpen(false);
  }

  function toggleMobileMenu() {
    setIsMobileMenuOpen((previousState) => !previousState);
  }

  return (
    <aside className="anova-sidebar">
      <div className="anova-sidebar-header">
        <div className="anova-sidebar-brand">
          <span className="anova-brand-mark">A</span>

          <div className="anova-brand-details">
            <h1>Anova</h1>
            <p>The Art of Intelligent Hospitality</p>
          </div>
        </div>

        <button
          type="button"
          className="anova-mobile-menu-toggle"
          onClick={toggleMobileMenu}
          aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="anova-navigation"
        >
          {isMobileMenuOpen ? "\u00D7" : "\u2630"}
        </button>
      </div>

      <nav
        id="anova-navigation"
        className={`anova-sidebar-nav ${
          isMobileMenuOpen ? "is-open" : ""
        }`}
        aria-label="Main navigation"
      >
        {navigation.map((section) => (
          <div className="anova-nav-section" key={section.title}>
            <p className="anova-nav-heading">{section.title}</p>

            {section.items.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleNavigation(item)}
                className={`anova-nav-item ${
                  activePage === item ? "active" : ""
                }`}
                aria-current={activePage === item ? "page" : undefined}
              >
                {item}
              </button>
            ))}
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

export default Sidebar;