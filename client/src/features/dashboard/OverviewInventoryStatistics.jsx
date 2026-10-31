import { useCallback, useEffect, useState } from 'react';
import { AnalyticsService } from '../inventory/services/analyticsService.js';
import { InventoryService } from '../inventory/services/inventoryService.js';
import './statistics.css';

export default function OverviewInventoryStatistics({
  selectedBranch = 'all',
  branches = [],
}) {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadInventoryStatistics = useCallback(async () => {
    setLoading(true);
    setError('');

    // Instant initial compute from local cached store
    try {
      const localMetrics = AnalyticsService.getDashboardKPIs(selectedBranch, branches);
      if (localMetrics) {
        setKpis(localMetrics);
      }
    } catch (err) {
      console.warn('[OverviewInventoryStatistics] Local KPI compute warning:', err.message);
    }

    // Live remote sync with Atlas backend
    try {
      const [remoteKpis] = await Promise.all([
        AnalyticsService.fetchDashboardKPIsRemote(selectedBranch),
        InventoryService.syncFromBackend(selectedBranch),
      ]);

      if (remoteKpis) {
        setKpis(remoteKpis);
      }
    } catch (err) {
      console.warn('[OverviewInventoryStatistics] Live sync error:', err.message);
      setKpis((prev) => {
        if (!prev) {
          setError('Failed to fetch live inventory statistics. Displaying cached data.');
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, branches]);

  useEffect(() => {
    loadInventoryStatistics();

    const handleSync = () => {
      loadInventoryStatistics();
    };

    window.addEventListener('focus', handleSync);
    window.addEventListener('anova_records_updated', handleSync);
    window.addEventListener('anova_branches_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('anova_records_updated', handleSync);
      window.removeEventListener('anova_branches_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadInventoryStatistics]);

  const hasData = Boolean(kpis);

  return (
    <section className="dashboard-statistics" aria-labelledby="inventory-statistics-title">
      <div className="statistics-heading">
        <div>
          <span className="statistics-eyebrow">LOGISTICS & INVENTORY</span>
          <h2 id="inventory-statistics-title">Inventory & Supply Chain</h2>
        </div>
      </div>

      {error && (
        <div className="statistics-error" role="status">
          {error}
        </div>
      )}

      <div className="statistics-grid">
        {/* 1. Total Inventory Valuation */}
        <article className="statistics-card statistics-gold">
          <div className="statistics-card-top">
            <span className="statistics-icon" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 5h11" />
                <path d="M7 9h11" />
                <path d="M10 5a4 4 0 0 1 0 8H7l7 7" />
              </svg>
            </span>
            <span className="statistics-label">Total Inventory Valuation</span>
          </div>
          <div className="statistics-value" aria-live="polite">
            {loading && !hasData ? (
              <span className="statistics-loading-dots" aria-label="Loading statistic">···</span>
            ) : (
              `₹${(kpis?.totalStockValue ?? 0).toLocaleString()}`
            )}
          </div>
          <p className="statistics-description">
            {kpis?.totalItemsTracked ?? 0} ingredients tracked{' '}
            {selectedBranch && selectedBranch !== 'all' ? 'at this branch' : 'across branches'}
          </p>
        </article>

        {/* 2. Low & Critical Stock Items */}
        <article className="statistics-card statistics-sage">
          <div className="statistics-card-top">
            <span className="statistics-icon" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" />
                <path d="M12 22V12" />
              </svg>
            </span>
            <span className="statistics-label">Low & Critical Stock Items</span>
          </div>
          <div className="statistics-value" aria-live="polite">
            {loading && !hasData ? (
              <span className="statistics-loading-dots" aria-label="Loading statistic">···</span>
            ) : (
              ((kpis?.criticalLowCount ?? 0) + (kpis?.lowStockCount ?? 0)).toLocaleString()
            )}
          </div>
          <p className="statistics-description">
            {kpis?.criticalLowCount ?? 0} critical, {kpis?.outOfStockCount ?? 0} zero stock
          </p>
        </article>

        {/* 3. Batches Expiring (≤7 Days) */}
        <article className="statistics-card statistics-orange">
          <div className="statistics-card-top">
            <span className="statistics-icon" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
            <span className="statistics-label">Batches Expiring (≤7 Days)</span>
          </div>
          <div className="statistics-value" aria-live="polite">
            {loading && !hasData ? (
              <span className="statistics-loading-dots" aria-label="Loading statistic">···</span>
            ) : (
              (kpis?.expiringBatchesCount ?? 0).toLocaleString()
            )}
          </div>
          <p className="statistics-description">
            Priority for chef prep & menu specials
          </p>
        </article>

        {/* 4. Active Purchase Orders */}
        <article className="statistics-card statistics-green">
          <div className="statistics-card-top">
            <span className="statistics-icon" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </span>
            <span className="statistics-label">Active Purchase Orders</span>
          </div>
          <div className="statistics-value" aria-live="polite">
            {loading && !hasData ? (
              <span className="statistics-loading-dots" aria-label="Loading statistic">···</span>
            ) : (
              (kpis?.activeOrderedPOs ?? 0).toLocaleString()
            )}
          </div>
          <p className="statistics-description">
            {kpis?.pendingApprovalPOs ?? 0} pending executive approval
          </p>
        </article>

        {/* 5. In-Transit Transfers */}
        <article className="statistics-card statistics-blue">
          <div className="statistics-card-top">
            <span className="statistics-icon" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </span>
            <span className="statistics-label">In-Transit Transfers</span>
          </div>
          <div className="statistics-value" aria-live="polite">
            {loading && !hasData ? (
              <span className="statistics-loading-dots" aria-label="Loading statistic">···</span>
            ) : (
              (kpis?.inTransitTransfers ?? 0).toLocaleString()
            )}
          </div>
          <p className="statistics-description">
            Branch logistics & movements active
          </p>
        </article>

        {/* 6. Recorded Spoilage / Loss */}
        <article className="statistics-card statistics-red">
          <div className="statistics-card-top">
            <span className="statistics-icon" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </span>
            <span className="statistics-label">Recorded Spoilage / Loss</span>
          </div>
          <div className="statistics-value" aria-live="polite">
            {loading && !hasData ? (
              <span className="statistics-loading-dots" aria-label="Loading statistic">···</span>
            ) : (
              `₹${(kpis?.totalWastageCost ?? 0).toLocaleString()}`
            )}
          </div>
          <p className="statistics-description">
            Financial waste & kitchen prep loss
          </p>
        </article>
      </div>
    </section>
  );
}
