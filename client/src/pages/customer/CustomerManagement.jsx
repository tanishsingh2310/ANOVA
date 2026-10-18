// client/src/pages/customer/CustomerManagement.jsx
import { useEffect, useState } from 'react';
import {
  Truck,
  Tag,
  MessageSquareQuote,
  LayoutDashboard,
  Clock3,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  ShoppingBag
} from 'lucide-react';
import '../../styles/customer-management.css';
import AdminDeliveries from '../../modules/customer/pages/AdminDeliveries';
import AdminCoupons from '../../modules/customer/pages/AdminCoupons';
import AdminFeedback from '../../modules/customer/pages/AdminFeedback';
import { listDeliveries } from '../../modules/customer/services/deliveryService';
import { listComplaints } from '../../modules/customer/services/adminFeedbackService';

const sum = (counts, keys) => (counts ? keys.reduce((n, k) => n + (counts[k] || 0), 0) : null);

function CustomerManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [deliveriesData, setDeliveriesData] = useState(undefined);
  const [complaintsData, setComplaintsData] = useState(undefined);

  useEffect(() => {
    listDeliveries()
      .then((r) => setDeliveriesData(r.counts || {}))
      .catch(() => setDeliveriesData(null));
    listComplaints()
      .then((r) => setComplaintsData(r.counts || {}))
      .catch(() => setComplaintsData(null));
  }, []);

  const show = (v) => (v === undefined ? '...' : v === null ? '\u2014' : v);

  const pendingRider = show(
    deliveriesData === undefined ? undefined : sum(deliveriesData, ['pending'])
  );
  const inProgressDeliveries = show(
    deliveriesData === undefined
      ? undefined
      : sum(deliveriesData, ['assigned', 'picked_up', 'on_the_way'])
  );
  const completedDeliveries = show(
    deliveriesData === undefined ? undefined : sum(deliveriesData, ['delivered'])
  );
  const openComplaints = show(
    complaintsData === undefined ? undefined : sum(complaintsData, ['open', 'in_review'])
  );

  return (
    <div className="customer-management-page">
      <div className="customer-page-header">
        <div>
          <span className="customer-eyebrow">ANOVA / MODULE 04</span>
          <h2>Customer Management & Analytics</h2>
          <p>
            Monitor real-time customer deliveries, promotional discount campaigns, and guest satisfaction ratings.
          </p>
        </div>
      </div>

      {/* Module Tabs */}
      <div className="customer-tabs">
        <button
          type="button"
          className={`customer-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <LayoutDashboard size={15} /> Overview & Analytics
        </button>
        <button
          type="button"
          className={`customer-tab-btn ${activeTab === 'deliveries' ? 'active' : ''}`}
          onClick={() => setActiveTab('deliveries')}
        >
          <Truck size={15} /> Deliveries
        </button>
        <button
          type="button"
          className={`customer-tab-btn ${activeTab === 'coupons' ? 'active' : ''}`}
          onClick={() => setActiveTab('coupons')}
        >
          <Tag size={15} /> Promotions & Coupons
        </button>
        <button
          type="button"
          className={`customer-tab-btn ${activeTab === 'feedback' ? 'active' : ''}`}
          onClick={() => setActiveTab('feedback')}
        >
          <MessageSquareQuote size={15} /> Feedback & Complaints
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Key Metric Summary Cards */}
          <section className="customer-summary-grid">
            <div className="customer-summary-card" onClick={() => setActiveTab('deliveries')} style={{ cursor: 'pointer' }}>
              <div className="customer-summary-top">
                <span>Waiting for Rider</span>
                <div className="customer-summary-icon">
                  <Clock3 size={18} />
                </div>
              </div>
              <div className="customer-summary-val">{pendingRider}</div>
              <p className="customer-summary-desc">Pending dispatch orders</p>
            </div>

            <div className="customer-summary-card" onClick={() => setActiveTab('deliveries')} style={{ cursor: 'pointer' }}>
              <div className="customer-summary-top">
                <span>In Progress</span>
                <div className="customer-summary-icon">
                  <Truck size={18} />
                </div>
              </div>
              <div className="customer-summary-val">{inProgressDeliveries}</div>
              <p className="customer-summary-desc">Active en-route deliveries</p>
            </div>

            <div className="customer-summary-card" onClick={() => setActiveTab('deliveries')} style={{ cursor: 'pointer' }}>
              <div className="customer-summary-top">
                <span>Delivered Orders</span>
                <div className="customer-summary-icon">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div className="customer-summary-val">{completedDeliveries}</div>
              <p className="customer-summary-desc">Fulfilled delivery orders</p>
            </div>

            <div className="customer-summary-card" onClick={() => setActiveTab('feedback')} style={{ cursor: 'pointer' }}>
              <div className="customer-summary-top">
                <span>Pending Complaints</span>
                <div className="customer-summary-icon">
                  <MessageSquareQuote size={18} />
                </div>
              </div>
              <div className="customer-summary-val">{openComplaints}</div>
              <p className="customer-summary-desc">Awaiting staff resolution</p>
            </div>
          </section>

          {/* Quick Module Cards */}
          <section className="customer-feature-grid">
            <div className="customer-feature-card" onClick={() => setActiveTab('deliveries')}>
              <div className="customer-feature-card-header">
                <div className="customer-feature-icon">
                  <Truck size={22} />
                </div>
                <ArrowRight size={18} className="customer-feature-arrow" />
              </div>
              <h3>Deliveries Management</h3>
              <p>Dispatch orders, assign delivery riders, and follow live GPS delivery status.</p>
            </div>

            <div className="customer-feature-card" onClick={() => setActiveTab('coupons')}>
              <div className="customer-feature-card-header">
                <div className="customer-feature-icon">
                  <Tag size={22} />
                </div>
                <ArrowRight size={18} className="customer-feature-arrow" />
              </div>
              <h3>Promotions & Coupons</h3>
              <p>Create discount campaigns, manage promo vouchers, and control per-customer limits.</p>
            </div>

            <div className="customer-feature-card" onClick={() => setActiveTab('feedback')}>
              <div className="customer-feature-card-header">
                <div className="customer-feature-icon">
                  <MessageSquareQuote size={22} />
                </div>
                <ArrowRight size={18} className="customer-feature-arrow" />
              </div>
              <h3>Feedback & Complaints</h3>
              <p>Moderate customer reviews, track star ratings, and reply to service complaints.</p>
            </div>
          </section>
        </>
      )}

      {activeTab === 'deliveries' && <AdminDeliveries />}
      {activeTab === 'coupons' && <AdminCoupons />}
      {activeTab === 'feedback' && <AdminFeedback />}
    </div>
  );
}

export default CustomerManagement;
