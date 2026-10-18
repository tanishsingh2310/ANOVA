import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useCart } from "../../modules/customer/context/CartContext";
import { getRole } from "../../modules/customer/utils/session";

const STAFF = ["owner", "admin", "manager"];

export default function Sidebar() {
  useLocation(); // ensures re-render on navigation or role change
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const cart = useCart();
  const role = getRole();

  const isDelivery = role === "delivery";
  const isStaff = STAFF.includes(role);

  let navigation = [];

  if (isDelivery) {
    // Delivery Partner: ONLY sees delivery dispatch tasks
    navigation = [
      {
        title: "Delivery Partner",
        items: [
          { name: "My deliveries", to: "/deliveries" },
        ],
      },
    ];
  } else if (isStaff) {
    // Manager / Admin / Owner: Full access to Operations & Management + Dashboard
    navigation = [
      {
        title: "Overview",
        items: [
          { name: "Dashboard", to: "/admin" },
          { name: "Home", to: "/" },
        ],
      },
      {
        title: "Operations & Management",
        items: [
          { name: "Deliveries", to: "/admin/deliveries" },
          { name: "Promotions", to: "/admin/coupons" },
          { name: "Admin Feedback", to: "/admin/feedback" },
        ],
      },
      {
        title: "Customer Preview",
        items: [
          { name: "Branches", to: "/branches" },
          { name: "Menu", to: "/menu" },
          { name: "Offers", to: "/offers" },
          { name: "Cart", to: "/cart", hasBadge: true },
          { name: "My orders", to: "/orders" },
        ],
      },
    ];
  } else {
    // Customer / Guest: ONLY sees customer ordering modules
    navigation = [
      {
        title: "Overview",
        items: [
          { name: "Home", to: "/" },
        ],
      },
      {
        title: "Customer Ordering",
        items: [
          { name: "Branches", to: "/branches" },
          { name: "Menu", to: "/menu" },
          { name: "Offers", to: "/offers" },
          { name: "Cart", to: "/cart", hasBadge: true },
          { name: "Checkout", to: "/checkout" },
          { name: "My orders", to: "/orders" },
          { name: "Feedback", to: "/feedback" },
          { name: "Profile", to: "/profile" },
        ],
      },
    ];
  }

  function toggleMobileMenu() {
    setIsMobileMenuOpen((previousState) => !previousState);
  }

  function handleNavClick() {
    setIsMobileMenuOpen(false);
  }

  const footerText = isDelivery
    ? "Delivery Partner Edition"
    : isStaff
    ? "Manager Operations Edition"
    : "Customer Experience Edition";

  return (
    <aside className="anova-sidebar">
      <div className="anova-sidebar-header">
        <NavLink
          to={isDelivery ? "/deliveries" : isStaff ? "/admin" : "/"}
          className="anova-sidebar-brand"
          style={{ textDecoration: "none" }}
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
        </NavLink>

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
              <NavLink
                key={item.name}
                to={item.to}
                end={item.to === "/" || item.to === "/admin" || item.to === "/deliveries"}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `anova-nav-item ${isActive ? "active" : ""}`
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  textDecoration: "none",
                }}
              >
                <span>{item.name}</span>
                {item.hasBadge && cart && cart.count > 0 && (
                  <span
                    style={{
                      background: "var(--color-accent, #C5A46D)",
                      color: "var(--color-primary, #183C34)",
                      fontSize: "11px",
                      fontWeight: 700,
                      borderRadius: "999px",
                      padding: "1px 7px",
                    }}
                  >
                    {cart.count}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="anova-sidebar-footer">
        <p>ANOVA MANAGEMENT SYSTEM</p>
        <span>{footerText}</span>
      </div>
    </aside>
  );
}