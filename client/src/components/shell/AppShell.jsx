// client/src/components/shell/AppShell.jsx
import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Truck,
  Tag,
  MessageSquareQuote,
  ExternalLink,
  LogOut,
  ShoppingBag,
  Store,
  Clock,
  User,
  Star,
  Home as HomeIcon,
  Menu as MenuIcon,
  X as CloseIcon,
  Percent
} from 'lucide-react';
import { useCart } from '../../modules/customer/context/CartContext';
import { clearToken, getRole } from '../../modules/customer/utils/session';
import { USE_MOCK } from '../../modules/customer/config';

export const STAFF = ['owner', 'admin', 'manager'];
export const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Administrator',
  manager: 'Branch Manager',
  delivery: 'Delivery Partner',
  customer: 'Guest'
};

const PAGE_TITLES = {
  '/admin': 'Executive Dashboard',
  '/admin/deliveries': 'Delivery Operations',
  '/admin/coupons': 'Promotions & Offers',
  '/admin/feedback': 'Feedback & Complaints',
  '/deliveries': 'My Delivery Tasks',
  '/': 'Welcome to Anova',
  '/branches': 'Our Locations',
  '/menu': 'Culinary Menu',
  '/offers': 'Exclusive Offers',
  '/cart': 'Your Order Cart',
  '/checkout': 'Secure Checkout',
  '/orders': 'Order History',
  '/feedback': 'Guest Feedback',
  '/profile': 'Guest Profile'
};

export default function AppShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const cart = useCart();
  const role = getRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const kind = role === 'customer'
    ? 'customer'
    : STAFF.includes(role)
    ? 'staff'
    : role === 'delivery'
    ? 'delivery'
    : null;

  const logout = () => {
    clearToken();
    cart.reset();
    navigate('/dev-login');
  };

  const pageTitle = PAGE_TITLES[location.pathname] || 'Customer Management';

  // Signed out / dev-login view
  if (!kind) {
    return (
      <div className="auth-stage" style={{
        minHeight: '100vh',
        background: 'var(--color-background)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 20px'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          <img
            src="/anova-emblem.png"
            alt="Anova"
            style={{ width: '64px', height: '64px', margin: '0 auto 12px', display: 'block', objectFit: 'contain' }}
          />
          <h1 style={{
            margin: '0 0 4px',
            fontFamily: 'Georgia, serif',
            color: 'var(--color-primary)',
            fontSize: '32px',
            fontWeight: 600,
            letterSpacing: '0.5px'
          }}>
            Anova
          </h1>
          <p style={{
            margin: 0,
            color: 'var(--color-text-secondary)',
            fontSize: '13px',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>
            The Art of Intelligent Hospitality
          </p>
        </div>

        {USE_MOCK && (
          <div style={{
            padding: '8px 16px',
            background: 'var(--color-accent-soft)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-pill)',
            color: 'var(--color-text)',
            fontSize: '12px',
            marginBottom: '20px'
          }}>
            Demo Mode: Connected to customer & analytics module
          </div>
        )}

        <main id="main" style={{ width: '100%', maxWidth: '520px' }}>
          {children}
        </main>

        <footer style={{ marginTop: '30px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
          Anova Enterprise Management System &bull; Hospitality Reimagined
        </footer>
      </div>
    );
  }

  // Customer (Guest) layout with luxury ANOVA header
  if (kind === 'customer') {
    return (
      <div className="app app--customer" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-background)' }}>
        <header style={{
          background: 'var(--color-primary)',
          borderBottom: '1px solid rgba(197, 164, 109, 0.3)',
          padding: '12px clamp(16px, 3vw, 40px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <img src="/anova-emblem.png" alt="Anova" style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
            <div>
              <span style={{ display: 'block', fontFamily: 'Georgia, serif', color: 'var(--color-accent)', fontSize: '22px', fontWeight: 600, letterSpacing: '0.5px', lineHeight: 1 }}>
                Anova
              </span>
              <span style={{ display: 'block', color: '#C4D1C9', fontSize: '9px', letterSpacing: '0.8px', marginTop: '3px' }}>
                Intelligent Hospitality
              </span>
            </div>
          </NavLink>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <NavLink
              to="/"
              end
              style={({ isActive }) => ({
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                color: isActive ? 'var(--color-accent)' : '#E0E8E2',
                background: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none'
              })}
            >
              <HomeIcon size={15} /> Home
            </NavLink>

            <NavLink
              to="/menu"
              style={({ isActive }) => ({
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                color: isActive ? 'var(--color-accent)' : '#E0E8E2',
                background: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none'
              })}
            >
              <ShoppingBag size={15} /> Menu
            </NavLink>

            <NavLink
              to="/branches"
              style={({ isActive }) => ({
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                color: isActive ? 'var(--color-accent)' : '#E0E8E2',
                background: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none'
              })}
            >
              <Store size={15} /> Branches
            </NavLink>

            <NavLink
              to="/offers"
              style={({ isActive }) => ({
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                color: isActive ? 'var(--color-accent)' : '#E0E8E2',
                background: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none'
              })}
            >
              <Percent size={15} /> Offers
            </NavLink>

            <NavLink
              to="/orders"
              style={({ isActive }) => ({
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                color: isActive ? 'var(--color-accent)' : '#E0E8E2',
                background: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none'
              })}
            >
              <Clock size={15} /> Orders
            </NavLink>

            <NavLink
              to="/feedback"
              style={({ isActive }) => ({
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                color: isActive ? 'var(--color-accent)' : '#E0E8E2',
                background: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none'
              })}
            >
              <Star size={15} /> Feedback
            </NavLink>

            <NavLink
              to="/cart"
              style={({ isActive }) => ({
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-pill)',
                color: 'var(--color-primary)',
                background: 'var(--color-accent)',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                marginLeft: '8px'
              })}
            >
              Cart
              {cart.count > 0 && (
                <span style={{
                  background: 'var(--color-primary)',
                  color: '#fff',
                  borderRadius: '50%',
                  padding: '2px 7px',
                  fontSize: '11px',
                  fontWeight: 700
                }}>
                  {cart.count}
                </span>
              )}
            </NavLink>

            <NavLink
              to="/profile"
              style={({ isActive }) => ({
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                color: isActive ? 'var(--color-accent)' : '#E0E8E2',
                fontSize: '13px',
                textDecoration: 'none'
              })}
            >
              <User size={15} /> Profile
            </NavLink>

            <button
              type="button"
              onClick={logout}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#E0E8E2',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                marginLeft: '6px'
              }}
            >
              <LogOut size={13} /> Exit
            </button>
          </nav>
        </header>

        <main id="main" style={{ flex: 1, width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '30px 20px' }}>
          {children}
        </main>

        <footer style={{
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          padding: '20px clamp(16px, 3vw, 40px)',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: '13px'
        }}>
          ANOVA &mdash; The Art of Intelligent Hospitality &bull; Enterprise Guest Experience
        </footer>
      </div>
    );
  }

  // Staff (Admin / Owner / Manager) layout using the official ANOVA sidebar & topbar
  return (
    <div className="anova-app-shell">
      <aside className="anova-sidebar">
        <div className="anova-sidebar-header">
          <NavLink to="/admin" className="anova-sidebar-brand" style={{ textDecoration: 'none' }}>
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
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>

        <nav
          id="anova-navigation"
          className={`anova-sidebar-nav ${mobileMenuOpen ? 'is-open' : ''}`}
          aria-label="Staff navigation"
        >
          <div className="anova-nav-section">
            <p className="anova-nav-heading">Overview</p>
            <NavLink
              to="/admin"
              end
              className={({ isActive }) => `anova-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <LayoutDashboard size={15} style={{ marginRight: '9px', opacity: 0.9 }} />
              Executive Dashboard
            </NavLink>
          </div>

          <div className="anova-nav-section">
            <p className="anova-nav-heading">Customer Operations</p>
            <NavLink
              to="/admin/deliveries"
              className={({ isActive }) => `anova-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Truck size={15} style={{ marginRight: '9px', opacity: 0.9 }} />
              Deliveries
            </NavLink>
            <NavLink
              to="/admin/coupons"
              className={({ isActive }) => `anova-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Tag size={15} style={{ marginRight: '9px', opacity: 0.9 }} />
              Promotions & Coupons
            </NavLink>
            <NavLink
              to="/admin/feedback"
              className={({ isActive }) => `anova-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <MessageSquareQuote size={15} style={{ marginRight: '9px', opacity: 0.9 }} />
              Feedback & Complaints
            </NavLink>
          </div>

          <div className="anova-nav-section">
            <p className="anova-nav-heading">Customer Portal</p>
            <NavLink
              to="/"
              className="anova-nav-item"
              onClick={() => setMobileMenuOpen(false)}
            >
              <ExternalLink size={15} style={{ marginRight: '9px', opacity: 0.9 }} />
              Guest Ordering View
            </NavLink>
          </div>
        </nav>

        <div className="anova-sidebar-footer">
          <p>ANOVA MANAGEMENT SYSTEM</p>
          <span>Customer & Analytics Workspace</span>
        </div>
      </aside>

      <main className="anova-main">
        <header className="anova-topbar">
          <div className="anova-topbar-heading">
            <p className="anova-topbar-eyebrow">ANOVA / CUSTOMER MANAGEMENT</p>
            <h2>{pageTitle}</h2>
          </div>

          <div className="anova-topbar-actions">
            <div className="anova-branch-indicator">
              <span className="anova-branch-dot"></span>
              <span>Main Branch</span>
            </div>

            <div className="anova-profile">
              <div className="anova-profile-avatar">
                {role ? role.substring(0, 2).toUpperCase() : 'AD'}
              </div>

              <div className="anova-profile-info">
                <strong>{ROLE_LABELS[role] || 'Staff Member'}</strong>
                <span>System Access</span>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text-secondary)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-error)';
                e.currentTarget.style.color = 'var(--color-error)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </header>

        <div className="anova-page-content">
          {children}
        </div>
      </main>
    </div>
  );
}
