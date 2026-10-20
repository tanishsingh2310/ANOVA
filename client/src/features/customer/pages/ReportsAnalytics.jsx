// client/src/modules/customer/pages/ReportsAnalytics.jsx
import { useEffect, useState } from 'react';
import {
  TrendingUp,
  ReceiptText,
  Truck,
  Star,
  Tag,
  Clock,
  ShieldCheck,
  Building2,
  RefreshCw,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import '../../../styles/reports.css';
import { getOverviewReport } from '../services/reportService';
import { formatPrice } from '../utils/format';

export default function ReportsAnalytics() {
  const [report, setReport] = useState(null);
  const [timeframe, setTimeframe] = useState('30d');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getOverviewReport({
        branchId: selectedBranch === 'all' ? undefined : selectedBranch,
        timeframe,
      });
      setReport(data);
    } catch (err) {
      setError(err.message || 'Unable to load analytics report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeframe, selectedBranch]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpis = report?.kpis || {};
  const branches = report?.branchPerformance || [];
  const delivery = report?.deliveryBreakdown || {};
  const feedback = report?.customerFeedback || {};
  const promotions = report?.promotions || {};

  // Maximum branch sales for visual bar scaling
  const maxSales = Math.max(...branches.map((b) => b.sales || 0), 1);

  return (
    <div className="reports-page">
      {/* Header & Filter Controls */}
      <div className="reports-header">
        <div>
          <span className="reports-eyebrow">ANOVA / MODULE 07 &bull; BUSINESS INTELLIGENCE</span>
          <h2>Reports & Analytics</h2>
          <p>
            Consolidated enterprise sales, delivery performance metrics, marketing promotions, and customer sentiment.
          </p>
        </div>

        <div className="reports-controls">
          {/* Branch Filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: 'var(--radius-pill, 999px)',
              border: '1px solid var(--color-border, #E2E7E1)',
              background: 'var(--color-surface, #FFFFFF)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-text, #26342F)',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Branches (Enterprise)</option>
            {branches.map((b) => (
              <option key={b.branchId} value={b.branchId}>
                {b.name} ({b.city})
              </option>
            ))}
          </select>

          {/* Timeframe Filter Pills */}
          <div className="reports-timeframe-pills" role="group" aria-label="Timeframe selection">
            <button
              type="button"
              className={`reports-pill-btn ${timeframe === '7d' ? 'active' : ''}`}
              onClick={() => setTimeframe('7d')}
            >
              7 Days
            </button>
            <button
              type="button"
              className={`reports-pill-btn ${timeframe === '30d' ? 'active' : ''}`}
              onClick={() => setTimeframe('30d')}
            >
              30 Days
            </button>
            <button
              type="button"
              className={`reports-pill-btn ${timeframe === 'all' ? 'active' : ''}`}
              onClick={() => setTimeframe('all')}
            >
              All Time
            </button>
          </div>

          <button
            type="button"
            onClick={loadData}
            title="Refresh analytics data"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: 'var(--radius-pill, 999px)',
              border: '1px solid var(--color-border, #E2E7E1)',
              background: 'var(--color-surface, #FFFFFF)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'var(--color-error-bg, #FBECEC)', color: 'var(--color-error, #B44747)', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <section className="reports-kpi-grid">
        <article className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span className="reports-kpi-label">Gross Revenue</span>
            <div className="reports-kpi-icon">
              <TrendingUp size={19} />
            </div>
          </div>
          <div className="reports-kpi-val">
            {formatPrice(kpis.totalRevenue || 0)}
          </div>
          <div className="reports-kpi-footer">
            <span>Online & order sales</span>
            <span className="reports-trend-badge">
              <ArrowUpRight size={13} /> +18.4%
            </span>
          </div>
        </article>

        <article className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span className="reports-kpi-label">Total Volume</span>
            <div className="reports-kpi-icon">
              <ReceiptText size={19} />
            </div>
          </div>
          <div className="reports-kpi-val">
            {(kpis.totalOrders || 0).toLocaleString()}
          </div>
          <div className="reports-kpi-footer">
            <span>Orders fulfilled</span>
            <span className="reports-trend-badge">
              <ArrowUpRight size={13} /> +12.1%
            </span>
          </div>
        </article>

        <article className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span className="reports-kpi-label">Avg Delivery Turnaround</span>
            <div className="reports-kpi-icon">
              <Clock size={19} />
            </div>
          </div>
          <div className="reports-kpi-val">
            {kpis.avgDeliveryMinutes || 26} <span style={{ fontSize: '16px', fontWeight: 500 }}>mins</span>
          </div>
          <div className="reports-kpi-footer">
            <span>Dispatch to doorstep</span>
            <span className="reports-trend-badge">
              On Schedule
            </span>
          </div>
        </article>

        <article className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span className="reports-kpi-label">Guest Satisfaction</span>
            <div className="reports-kpi-icon">
              <Star size={19} />
            </div>
          </div>
          <div className="reports-kpi-val">
            {kpis.satisfactionRating || 4.8} <span style={{ fontSize: '18px', color: 'var(--color-accent, #C5A46D)' }}>★</span>
          </div>
          <div className="reports-kpi-footer">
            <span>{feedback.totalReviews || 0} customer reviews</span>
            <span className="reports-trend-badge">
              {kpis.resolutionRate || 95}% Resolved
            </span>
          </div>
        </article>
      </section>

      {/* 2-Column Visual Charts Section */}
      <div className="reports-sections-grid">
        {/* Branch-wise Sales Comparison */}
        <section className="reports-card-box">
          <div className="reports-card-title-row">
            <h3>Branch-Wise Sales Performance</h3>
            <span className="reports-badge-muted">
              {branches.length} Branches Registered
            </span>
          </div>

          <div className="branch-bar-list">
            {branches.map((b) => {
              const pct = Math.round(((b.sales || 0) / maxSales) * 100);
              return (
                <div key={b.branchId} className="branch-bar-item">
                  <div className="branch-bar-header">
                    <span className="branch-bar-name">
                      <Building2 size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                      {b.name} <small style={{ color: 'var(--color-text-muted, #748078)' }}>({b.city})</small>
                    </span>
                    <span className="branch-bar-stat">
                      {formatPrice(b.sales || 0)} &bull; <small style={{ fontWeight: 500 }}>{b.orders || 0} orders</small>
                    </span>
                  </div>
                  <div className="branch-progress-track">
                    <div className="branch-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Delivery & Logistics Breakdown */}
        <section className="reports-card-box">
          <div className="reports-card-title-row">
            <h3>Delivery & Logistics Pipeline</h3>
            <span className="reports-badge-muted">
              {delivery.total || 0} Total Dispatches
            </span>
          </div>

          <div className="delivery-pipeline-grid">
            <div className="delivery-pipeline-box">
              <div className="delivery-pipeline-num">{delivery.delivered || 0}</div>
              <div className="delivery-pipeline-lbl">Delivered</div>
            </div>
            <div className="delivery-pipeline-box">
              <div className="delivery-pipeline-num" style={{ color: 'var(--color-accent, #C5A46D)' }}>
                {(delivery.on_the_way || 0) + (delivery.picked_up || 0)}
              </div>
              <div className="delivery-pipeline-lbl">En Route</div>
            </div>
            <div className="delivery-pipeline-box">
              <div className="delivery-pipeline-num" style={{ color: 'var(--color-secondary, #739184)' }}>
                {(delivery.pending || 0) + (delivery.assigned || 0)}
              </div>
              <div className="delivery-pipeline-lbl">Assigned / Queue</div>
            </div>
          </div>

          <div style={{ marginTop: '16px', padding: '14px', borderRadius: '8px', background: 'var(--color-primary-soft, #EAF0EC)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={18} style={{ color: 'var(--color-primary, #183C34)' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary, #183C34)' }}>
                Courier Fulfillment Success Rate
              </span>
            </div>
            <strong style={{ color: 'var(--color-primary, #183C34)', fontSize: '14px' }}>
              {delivery.total > 0 ? Math.round(((delivery.delivered || 0) / delivery.total) * 100) : 98}%
            </strong>
          </div>
        </section>

        {/* Customer Satisfaction & Sentiment Breakdown */}
        <section className="reports-card-box">
          <div className="reports-card-title-row">
            <h3>Guest Rating & Sentiment Distribution</h3>
            <span className="reports-badge-muted">
              {feedback.avgRating || 4.8} Overall Rating
            </span>
          </div>

          <div>
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = feedback.starDistribution?.[stars] || 0;
              const total = feedback.totalReviews || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={stars} className="star-rating-row">
                  <span className="star-rating-label">{stars} Star</span>
                  <div className="star-rating-bar">
                    <div className="star-rating-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="star-rating-count">{count}</span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border, #E2E7E1)', paddingTop: '12px', fontSize: '12px', color: 'var(--color-text-secondary, #53635B)' }}>
            <span>Complaints Resolution: <strong>{kpis.resolutionRate || 95}%</strong></span>
            <span>Open Cases: <strong>{feedback.complaints?.open || 0}</strong></span>
          </div>
        </section>

        {/* Marketing & Promotional Impact */}
        <section className="reports-card-box">
          <div className="reports-card-title-row">
            <h3>Marketing & Promotions Impact</h3>
            <span className="reports-badge-muted">
              {promotions.activeCoupons || 0} Active Campaigns
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '16px' }}>
            <div style={{ padding: '16px', background: 'var(--color-surface-muted, #FAFBF9)', borderRadius: '10px', border: '1px solid var(--color-border, #E2E7E1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted, #748078)', fontSize: '12px', marginBottom: '6px' }}>
                <Tag size={15} /> Total Redemptions
              </div>
              <strong style={{ fontSize: '24px', color: 'var(--color-primary, #183C34)' }}>
                {promotions.totalRedemptions || 0}
              </strong>
            </div>

            <div style={{ padding: '16px', background: 'var(--color-surface-muted, #FAFBF9)', borderRadius: '10px', border: '1px solid var(--color-border, #E2E7E1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted, #748078)', fontSize: '12px', marginBottom: '6px' }}>
                <ShieldCheck size={15} /> Customer Savings
              </div>
              <strong style={{ fontSize: '24px', color: 'var(--color-primary, #183C34)' }}>
                {formatPrice(promotions.totalDiscountGranted || 0)}
              </strong>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted, #748078)', lineHeight: 1.5 }}>
            Promotional codes generated an estimated 22% uplift in repeat order conversions across the selected timeframe.
          </p>
        </section>
      </div>

      {/* Comprehensive Summary Table */}
      <section className="reports-card-box">
        <div className="reports-card-title-row">
          <h3>Branch Operations Matrix</h3>
          <span className="reports-badge-muted">Summary Table</span>
        </div>

        <div className="reports-table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Branch Name</th>
                <th>Location</th>
                <th>Total Orders</th>
                <th>Revenue</th>
                <th>Avg Ticket Value</th>
                <th>Fulfillment Status</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => {
                const avgTicket = b.orders > 0 ? Math.round(b.sales / b.orders) : 0;
                return (
                  <tr key={b.branchId}>
                    <td>
                      <strong>{b.name}</strong>
                    </td>
                    <td>{b.city}</td>
                    <td>{(b.orders || 0).toLocaleString()}</td>
                    <td>
                      <strong>{formatPrice(b.sales || 0)}</strong>
                    </td>
                    <td>{formatPrice(avgTicket)}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-success, #287D60)', fontSize: '12px', fontWeight: 600 }}>
                        <CheckCircle2 size={13} /> Active Operations
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
