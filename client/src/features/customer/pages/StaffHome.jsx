// client/src/modules/customer/pages/StaffHome.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  Tag,
  MessageSquareQuote,
  Clock3,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers
} from 'lucide-react';
import { ROLE_LABELS } from '../../../components/shell/AppShell';
import { listDeliveries } from '../services/deliveryService';
import { listComplaints } from '../services/adminFeedbackService';
import { getRole } from '../utils/session';

const sum = (counts, keys) => (counts ? keys.reduce((n, k) => n + (counts[k] || 0), 0) : null);

export default function StaffHome() {
  const [d, setD] = useState(undefined); // undefined = loading, null = could not load
  const [c, setC] = useState(undefined);
  const role = getRole();

  useEffect(() => {
    listDeliveries().then((r) => setD(r.counts || {})).catch(() => setD(null));
    listComplaints().then((r) => setC(r.counts || {})).catch(() => setC(null));
  }, []);

  const show = (v) => (v === undefined ? '...' : v === null ? '\u2014' : v);

  const pendingCount = show(d === undefined ? undefined : sum(d, ['pending']));
  const inProgressCount = show(d === undefined ? undefined : sum(d, ['assigned', 'picked_up', 'on_the_way']));
  const deliveredCount = show(d === undefined ? undefined : sum(d, ['delivered']));
  const complaintsCount = show(c === undefined ? undefined : sum(c, ['open', 'in_review']));

  return (
    <div className="dashboard-page">
      {/* Welcome Banner */}
      <section className="dashboard-welcome">
        <div className="dashboard-welcome-content">
          <p className="dashboard-eyebrow dashboard-welcome-eyebrow">
            <span className="dashboard-eyebrow-line" />
            ANOVA EXECUTIVE OVERVIEW
          </p>

          <h1>Welcome, {ROLE_LABELS[role] || 'Administrator'}</h1>

          <p className="dashboard-welcome-description">
            Monitor real-time customer deliveries, active promotions, and customer satisfaction metrics.
          </p>
        </div>

        <button
          className="dashboard-workspace-badge"
          type="button"
          aria-label="Current workspace: Main Branch"
        >
          <span className="dashboard-workspace-icon">
            <MapPin size={17} />
          </span>

          <span className="dashboard-workspace-details">
            <span className="dashboard-workspace-label">WORKSPACE</span>
            <strong>Main Branch</strong>
          </span>

          <ChevronRight size={17} className="dashboard-workspace-chevron" />
        </button>
      </section>

      {/* KPI Stats Grid */}
      <section className="dashboard-summary" aria-label="Customer operations summary">
        <Link to="/admin/deliveries" style={{ textDecoration: 'none' }}>
          <article className="dashboard-summary-card dashboard-summary-card-orders">
            <div className="dashboard-summary-heading">
              <span className="dashboard-summary-label">Waiting for Rider</span>
              <span className="dashboard-summary-icon">
                <Clock3 size={21} strokeWidth={1.8} />
              </span>
            </div>

            <div className="dashboard-summary-value-row">
              <h2>{pendingCount}</h2>
            </div>

            <div className="dashboard-summary-footer">
              <p>Unassigned dispatch orders</p>
              <span className="dashboard-summary-trend dashboard-summary-trend-neutral">
                Live
              </span>
            </div>
          </article>
        </Link>

        <Link to="/admin/deliveries" style={{ textDecoration: 'none' }}>
          <article className="dashboard-summary-card dashboard-summary-card-reservations">
            <div className="dashboard-summary-heading">
              <span className="dashboard-summary-label">In Progress</span>
              <span className="dashboard-summary-icon">
                <Truck size={21} strokeWidth={1.8} />
              </span>
            </div>

            <div className="dashboard-summary-value-row">
              <h2>{inProgressCount}</h2>
            </div>

            <div className="dashboard-summary-footer">
              <p>Active en-route deliveries</p>
              <span className="dashboard-summary-trend dashboard-summary-trend-up">
                <TrendingUp size={14} strokeWidth={2} />
                Tracking
              </span>
            </div>
          </article>
        </Link>

        <Link to="/admin/deliveries" style={{ textDecoration: 'none' }}>
          <article className="dashboard-summary-card dashboard-summary-card-revenue">
            <div className="dashboard-summary-heading">
              <span className="dashboard-summary-label">Completed Deliveries</span>
              <span className="dashboard-summary-icon">
                <CheckCircle2 size={21} strokeWidth={1.8} />
              </span>
            </div>

            <div className="dashboard-summary-value-row">
              <h2>{deliveredCount}</h2>
            </div>

            <div className="dashboard-summary-footer">
              <p>Successfully delivered</p>
              <span className="dashboard-summary-trend dashboard-summary-trend-up">
                Fulfilled
              </span>
            </div>
          </article>
        </Link>

        <Link to="/admin/feedback" style={{ textDecoration: 'none' }}>
          <article className="dashboard-summary-card dashboard-summary-card-tables">
            <div className="dashboard-summary-heading">
              <span className="dashboard-summary-label">Open Complaints</span>
              <span className="dashboard-summary-icon">
                <MessageSquareQuote size={21} strokeWidth={1.8} />
              </span>
            </div>

            <div className="dashboard-summary-value-row">
              <h2>{complaintsCount}</h2>
            </div>

            <div className="dashboard-summary-footer">
              <p>Awaiting staff resolution</p>
              <span className={`dashboard-summary-trend ${complaintsCount > 0 ? 'dashboard-summary-trend-down' : 'dashboard-summary-trend-neutral'}`}>
                {complaintsCount > 0 ? 'Attention' : 'Clear'}
              </span>
            </div>
          </article>
        </Link>
      </section>

      {/* Module Navigation Grid */}
      <section className="dashboard-modules-section">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-eyebrow dashboard-section-eyebrow">
              <span className="dashboard-eyebrow-line" />
              OPERATIONAL WORKSPACE
            </p>
            <h2>Customer Management & Analytics</h2>
          </div>

          <span className="dashboard-module-count">
            <Layers size={15} strokeWidth={1.8} />
            <span>03 MODULES</span>
          </span>
        </div>

        <div className="dashboard-module-grid">
          <Link to="/admin/deliveries" style={{ textDecoration: 'none' }}>
            <article className="dashboard-module-card dashboard-module-card-orders">
              <div className="dashboard-module-card-top">
                <span className="dashboard-module-icon">
                  <Truck size={22} strokeWidth={1.7} />
                </span>
                <span className="dashboard-module-arrow" aria-hidden="true">
                  <ArrowRight size={17} strokeWidth={1.8} />
                </span>
              </div>
              <h3>Delivery Operations</h3>
              <p>Dispatch orders, assign delivery partners, and monitor GPS live tracking in real time.</p>
              <span className="dashboard-module-decoration" aria-hidden="true" />
            </article>
          </Link>

          <Link to="/admin/coupons" style={{ textDecoration: 'none' }}>
            <article className="dashboard-module-card dashboard-module-card-billing">
              <div className="dashboard-module-card-top">
                <span className="dashboard-module-icon">
                  <Tag size={22} strokeWidth={1.7} />
                </span>
                <span className="dashboard-module-arrow" aria-hidden="true">
                  <ArrowRight size={17} strokeWidth={1.8} />
                </span>
              </div>
              <h3>Promotions & Coupons</h3>
              <p>Create discount campaigns, manage promo vouchers, and track promotional usage analytics.</p>
              <span className="dashboard-module-decoration" aria-hidden="true" />
            </article>
          </Link>

          <Link to="/admin/feedback" style={{ textDecoration: 'none' }}>
            <article className="dashboard-module-card dashboard-module-card-kitchen">
              <div className="dashboard-module-card-top">
                <span className="dashboard-module-icon">
                  <MessageSquareQuote size={22} strokeWidth={1.7} />
                </span>
                <span className="dashboard-module-arrow" aria-hidden="true">
                  <ArrowRight size={17} strokeWidth={1.8} />
                </span>
              </div>
              <h3>Feedback & Resolution</h3>
              <p>Review customer ratings, analyze satisfaction sentiment, and resolve guest complaints.</p>
              <span className="dashboard-module-decoration" aria-hidden="true" />
            </article>
          </Link>
        </div>
      </section>

      {/* System Status Banner */}
      <section className="dashboard-activity">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-eyebrow dashboard-section-eyebrow">
              <span className="dashboard-eyebrow-line" />
              INTEGRATION STATUS
            </p>
            <h2>System Health & Service Access</h2>
          </div>

          <span className="dashboard-module-count dashboard-demo-label">
            <Activity size={15} strokeWidth={1.8} />
            <span>OPERATIONAL</span>
          </span>
        </div>

        <div className="dashboard-activity-list">
          <article className="dashboard-activity-item">
            <span className="dashboard-activity-icon dashboard-activity-icon-order">
              <CheckCircle2 size={19} strokeWidth={1.8} />
            </span>
            <div className="dashboard-activity-details">
              <h3>Customer API & RBAC Security</h3>
              <p>Role-based access active for {ROLE_LABELS[role] || 'Administrator'}. Connected to backend services.</p>
            </div>
            <time className="dashboard-activity-time">
              Live
            </time>
          </article>
        </div>
      </section>

      <footer className="dashboard-footer">
        <span>Anova Enterprise Management System</span>
        <span>Customer Analytics & Operations Workspace</span>
      </footer>
    </div>
  );
}
