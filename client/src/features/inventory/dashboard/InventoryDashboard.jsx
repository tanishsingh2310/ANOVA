import { useState, useEffect } from 'react';
import { AnalyticsService } from '../services/analyticsService';
import { InventoryService } from '../services/inventoryService';
import StockBadge from '../components/StockBadge';
import { RefreshCw } from 'lucide-react';
import '../../../styles/inventory-dashboard.css';

export default function InventoryDashboard({ branchId, onNavigate, branches = [] }) {
  const [selectedBranch, setSelectedBranch] = useState(branchId || 'all');
  const [kpis, setKpis] = useState(null);
  const [expiringBatches, setExpiringBatches] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);

  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setSelectedBranch(branchId || 'all');
  }, [branchId]);

  const loadData = async (targetBranch = selectedBranch) => {
    // Initial local compute for instant render
    const metrics = AnalyticsService.getDashboardKPIs(targetBranch, branches);
    setKpis(metrics);

    const expiring = InventoryService.getExpiringBatches(7, targetBranch);
    setExpiringBatches(expiring.slice(0, 5));

    const ingredients = InventoryService.getIngredients({ branchId: targetBranch }, branches);
    const low = ingredients
      .map(i => ({
        ...i,
        status: InventoryService.calculateStockStatus(i, targetBranch, branches)
      }))
      .filter(i => i.status.level === 'CRITICAL' || i.status.level === 'LOW_STOCK' || i.status.level === 'OUT_OF_STOCK');
    setLowStockItems(low.slice(0, 6));

    // Live remote sync from Atlas backend
    setIsSyncing(true);
    try {
      const [remoteKpis, remoteExpiring, remoteIngs] = await Promise.all([
        AnalyticsService.fetchDashboardKPIsRemote(targetBranch),
        InventoryService.getExpiringBatchesRemote(7, targetBranch),
        InventoryService.syncFromBackend(targetBranch)
      ]);

      if (remoteKpis) setKpis(remoteKpis);
      if (remoteExpiring) setExpiringBatches(remoteExpiring.slice(0, 5));
      if (remoteIngs) {
        const remoteLow = remoteIngs
          .map(i => ({
            ...i,
            status: InventoryService.calculateStockStatus(i, targetBranch, branches)
          }))
          .filter(i => i.status.level === 'CRITICAL' || i.status.level === 'LOW_STOCK' || i.status.level === 'OUT_OF_STOCK');
        setLowStockItems(remoteLow.slice(0, 6));
      }
    } catch (err) {
      console.warn('Dashboard live sync error:', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData(selectedBranch);
  }, [selectedBranch]);

  if (!kpis) return <div>Loading executive dashboard...</div>;

  return (
    <div className="inv-dashboard-container">
      <div className="employees-heading" style={{ marginBottom: '18px' }}>
        <div>
          <p>Real-time executive overview of stock levels, procurement alerts, and valuation.</p>
        </div>
        <div className="employees-heading-actions">
          <button
            type="button"
            className="employees-button employees-button-secondary"
            onClick={() => loadData(selectedBranch)}
            disabled={isSyncing}
          >
            <RefreshCw size={16} className={isSyncing ? 'employees-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="employees-toolbar" style={{ marginBottom: '20px' }}>
        <label className="employees-filter">
          <span>Branch</span>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="all">All branches</option>
            {branches.map((b) => (
              <option key={b.id || b._id} value={b.id || b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {/* Alert Header if critical stock or expiring batches */}
      {kpis.totalAlerts > 0 && (
        <div className="inv-alert-banner inv-alert-warning">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(217, 119, 6, 0.15)',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <span>
              {kpis.criticalLowCount > 0 || kpis.outOfStockCount > 0 ? (
                <>
                  <strong>Inventory Notice:</strong> {kpis.criticalLowCount} items critically low, {kpis.outOfStockCount} out of stock{kpis.expiringBatchesCount > 0 ? `, and ${kpis.expiringBatchesCount} batches expiring within 7 days.` : '.'}
                </>
              ) : (
                <>
                  <strong>Batch Expiry Notice:</strong> {kpis.expiringBatchesCount} ingredient batch(es) nearing expiration within 7 days requiring consumption priority.
                </>
              )}
            </span>
          </div>
          <button
            type="button"
            className="inv-btn inv-btn-sm inv-btn-gold"
            onClick={() => onNavigate(kpis.criticalLowCount > 0 ? 'inv-ingredients' : 'inv-wastage')}
          >
            {kpis.criticalLowCount > 0 ? 'Review Stock Shortages →' : 'Review Expiry Schedule →'}
          </button>
        </div>
      )}

      {/* KPI Cards Grid with Vibrant Icons */}
      <div className="inv-kpi-grid">
        <div className="inv-kpi-card success">
          <div className="inv-kpi-header">
            <span className="inv-kpi-label">Total Inventory Valuation</span>
            <div className="inv-kpi-icon valuation" title="Total Valuation (₹ INR)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 5h11" />
                <path d="M7 9h11" />
                <path d="M10 5a4 4 0 0 1 0 8H7l7 7" />
              </svg>
            </div>
          </div>
          <div className="inv-kpi-value">₹{kpis.totalStockValue.toLocaleString()}</div>
          <div className="inv-kpi-sub">{kpis.totalItemsTracked} ingredients tracked across branches</div>
        </div>

        <div className={`inv-kpi-card ${kpis.lowStockCount > 0 ? 'warning' : ''}`}>
          <div className="inv-kpi-header">
            <span className="inv-kpi-label">Low & Critical Stock Items</span>
            <div className={`inv-kpi-icon stock ${kpis.criticalLowCount > 0 ? 'is-alert' : ''}`} title="Stock Safety">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                <path d="m3.3 7 8.7 5 8.7-5"/>
                <path d="M12 22V12"/>
              </svg>
            </div>
          </div>
          <div className="inv-kpi-value" style={{ color: kpis.criticalLowCount > 0 ? 'var(--color-error)' : 'inherit' }}>
            {kpis.criticalLowCount + kpis.lowStockCount}
          </div>
          <div className="inv-kpi-sub">{kpis.criticalLowCount} critical, {kpis.outOfStockCount} zero stock</div>
        </div>

        <div className={`inv-kpi-card ${kpis.expiringBatchesCount > 0 ? 'warning' : ''}`}>
          <div className="inv-kpi-header">
            <span className="inv-kpi-label">Batches Expiring (≤7 Days)</span>
            <div className="inv-kpi-icon expiring" title="Batch Expiry">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
          </div>
          <div className="inv-kpi-value" style={{ color: kpis.expiringBatchesCount > 0 ? 'var(--color-warning)' : 'inherit' }}>
            {kpis.expiringBatchesCount}
          </div>
          <div className="inv-kpi-sub">Priority for chef prep & menu specials</div>
        </div>

        <div className="inv-kpi-card">
          <div className="inv-kpi-header">
            <span className="inv-kpi-label">Active Purchase Orders</span>
            <div className="inv-kpi-icon orders" title="Purchase Orders">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
          </div>
          <div className="inv-kpi-value">{kpis.activeOrderedPOs}</div>
          <div className="inv-kpi-sub">{kpis.pendingApprovalPOs} pending executive approval</div>
        </div>

        <div className="inv-kpi-card">
          <div className="inv-kpi-header">
            <span className="inv-kpi-label">In-Transit Transfers</span>
            <div className="inv-kpi-icon transfers" title="Branch Transfers">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2" ry="2"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
          </div>
          <div className="inv-kpi-value">{kpis.inTransitTransfers}</div>
          <div className="inv-kpi-sub">Branch logistics & movements active</div>
        </div>

        <div className="inv-kpi-card danger">
          <div className="inv-kpi-header">
            <span className="inv-kpi-label">Recorded Spoilage / Loss</span>
            <div className="inv-kpi-icon spoilage" title="Recorded Loss">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </div>
          </div>
          <div className="inv-kpi-value" style={{ color: 'var(--color-error)' }}>
            ₹{kpis.totalWastageCost.toLocaleString()}
          </div>
          <div className="inv-kpi-sub">Financial waste & kitchen prep loss</div>
        </div>
      </div>

      {/* Two Column Section: Action Bar + Critical Stock + Expiring Batches */}
      <div className="inv-dashboard-split">
        {/* Critical Stock List */}
        <div className="inv-card">
          <div className="inv-card-header">
            <div>
              <h3>Stock Replenishment Alerts</h3>
              <p>Ingredients below minimum threshold requiring reorder</p>
            </div>
            <button
              type="button"
              className="inv-btn inv-btn-sm inv-btn-primary"
              onClick={() => onNavigate('inv-orders')}
            >
              Create PO
            </button>
          </div>
          <div className="inv-card-body" style={{ padding: 0 }}>
            {lowStockItems.length === 0 ? (
              <div className="inv-healthy-state">
                <div className="inv-healthy-state-icon">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                </div>
                <h4 className="inv-healthy-state-title">Stock Levels Fully Adequate</h4>
                <p className="inv-healthy-state-desc">
                  All ingredient inventories across active branches currently meet or exceed designated minimum safety thresholds. Zero reorder requisitions required at this time.
                </p>
                <div className="inv-healthy-state-metrics">
                  <div className="inv-healthy-metric">
                    <span className="inv-healthy-metric-value">100%</span>
                    <span className="inv-healthy-metric-label">Buffer Compliance</span>
                  </div>
                  <div className="inv-healthy-metric-divider" />
                  <div className="inv-healthy-metric">
                    <span className="inv-healthy-metric-value">0</span>
                    <span className="inv-healthy-metric-label">Stock Deficits</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="inv-btn inv-btn-sm inv-btn-secondary"
                  onClick={() => onNavigate('inv-ingredients')}
                  style={{ marginTop: '4px' }}
                >
                  View Full Ingredient Catalog →
                </button>
              </div>
            ) : (
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Current Stock</th>
                    <th>Min Level</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item) => (
                    <tr key={item.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <strong>{item.name}</strong> <code style={{ fontSize: '10px', marginLeft: '5px' }}>{item.sku}</code>
                      </td>
                      <td className="inv-cell-nowrap">
                        <strong style={{ color: item.status.qty <= 0 ? 'var(--color-error)' : 'inherit' }}>
                          {item.status.qty} {item.baseUnit}
                        </strong>
                      </td>
                      <td className="inv-cell-nowrap">{item.minThreshold} {item.baseUnit}</td>
                      <td className="inv-cell-badge"><StockBadge status={item.status} /></td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          className="inv-btn inv-btn-sm inv-btn-gold"
                          onClick={() => onNavigate('inv-orders')}
                        >
                          Order
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Expiring Batches */}
        <div className="inv-card">
          <div className="inv-card-header">
            <div>
              <h3>Expiry Watchlist (Next 7 Days)</h3>
              <p>Batches nearing expiration requiring consumption priority</p>
            </div>
            <button
              type="button"
              className="inv-btn inv-btn-sm inv-btn-secondary"
              onClick={() => onNavigate('inv-wastage')}
            >
              Record Spoilage
            </button>
          </div>
          <div className="inv-card-body" style={{ padding: 0 }}>
            {expiringBatches.length === 0 ? (
              <div className="inv-healthy-state" style={{ minHeight: '220px' }}>
                <div className="inv-healthy-state-icon" style={{ background: 'rgba(24, 60, 52, 0.08)', color: 'var(--color-primary)', borderColor: 'rgba(24, 60, 52, 0.18)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 14 14"/>
                  </svg>
                </div>
                <h4 className="inv-healthy-state-title">No Immediate Expiries</h4>
                <p className="inv-healthy-state-desc">
                  All active kitchen batches are comfortably within their consumption life-cycle. Next audit scheduled in 7 days.
                </p>
              </div>
            ) : (
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Batch #</th>
                    <th>Ingredient</th>
                    <th>Quantity</th>
                    <th>Expiry Date</th>
                    <th>Urgency</th>
                  </tr>
                </thead>
                <tbody>
                  {expiringBatches.map((b) => (
                    <tr key={b.batchNumber}>
                      <td className="inv-cell-code"><code>{b.batchNumber}</code></td>
                      <td>{b.ingredientName}</td>
                      <td className="inv-cell-nowrap"><strong>{b.qty} {b.unit}</strong></td>
                      <td className="inv-cell-date">{b.expiryDate}</td>
                      <td className="inv-cell-badge">
                        {b.isExpired ? (
                          <span className="inv-badge inv-badge-danger">EXPIRED</span>
                        ) : (
                          <span className="inv-badge inv-badge-warning">{b.diffDays} day{b.diffDays > 1 ? 's' : ''} left</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Dock */}
      <div className="inv-card" style={{ marginTop: '10px' }}>
        <div className="inv-card-header">
          <div>
            <h3>Quick Logistics & Procurement Actions</h3>
            <p>Common inventory workflows for restaurant branch operations</p>
          </div>
        </div>
        <div className="inv-card-body">
          <div className="inv-quick-actions-grid">
            <button
              type="button"
              className="inv-btn inv-btn-primary inv-action-btn"
              onClick={() => onNavigate('inv-ingredients')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e4c58e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                <path d="m3.3 7 8.7 5 8.7-5"/>
                <path d="M12 22V12"/>
              </svg>
              <span>Manage Ingredients & Stock</span>
            </button>
            <button
              type="button"
              className="inv-btn inv-btn-gold inv-action-btn"
              onClick={() => onNavigate('inv-orders')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#183c34" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              <span>Purchase Orders & GRN</span>
            </button>
            <button
              type="button"
              className="inv-btn inv-btn-transfer inv-action-btn"
              onClick={() => onNavigate('inv-transfers')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#183c34" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9"/>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <polyline points="7 23 3 19 7 15"/>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
              <span>Dispatch Branch Transfer</span>
            </button>
            <button
              type="button"
              className="inv-btn inv-btn-spoilage inv-action-btn"
              onClick={() => onNavigate('inv-wastage')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              <span>Log Spoilage Write-Off</span>
            </button>
            <button
              type="button"
              className="inv-btn inv-btn-analytics inv-action-btn"
              onClick={() => onNavigate('inv-reports')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c49a5b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              <span>Valuation & Analytics</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
