import { useState, useEffect } from 'react';
import { AnalyticsService } from '../services/analyticsService';
import { InventoryService } from '../services/inventoryService';
import StockBadge from '../components/StockBadge';

export default function InventoryDashboard({ branchId, onNavigate }) {
  const [kpis, setKpis] = useState(null);
  const [expiringBatches, setExpiringBatches] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);

  const loadData = () => {
    const metrics = AnalyticsService.getDashboardKPIs(branchId);
    setKpis(metrics);

    const expiring = InventoryService.getExpiringBatches(7, branchId);
    setExpiringBatches(expiring.slice(0, 5));

    const ingredients = InventoryService.getIngredients({ branchId });
    const low = ingredients
      .map(i => ({
        ...i,
        status: InventoryService.calculateStockStatus(i, branchId)
      }))
      .filter(i => i.status.level === 'CRITICAL' || i.status.level === 'LOW_STOCK' || i.status.level === 'OUT_OF_STOCK');
    setLowStockItems(low.slice(0, 6));
  };

  useEffect(() => {
    loadData();
  }, [branchId]);

  if (!kpis) return <div>Loading executive dashboard...</div>;

  return (
    <div className="inv-dashboard-container">
      {/* Alert Header if critical stock or expiring batches */}
      {kpis.totalAlerts > 0 && (
        <div className="inv-alert-banner inv-alert-warning">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span>
              <strong>Inventory Warning:</strong> {kpis.criticalLowCount} items critically low, {kpis.outOfStockCount} out of stock, and {kpis.expiringBatchesCount} batches expiring within 7 days.
            </span>
          </div>
          <button
            type="button"
            className="inv-btn inv-btn-sm inv-btn-gold"
            onClick={() => onNavigate('inv-ingredients')}
          >
            Review Stock Shortages →
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="inv-kpi-grid">
        <div className="inv-kpi-card success">
          <div className="inv-kpi-header">
            <span className="inv-kpi-label">Total Inventory Valuation</span>
            <span className="inv-kpi-icon">💰</span>
          </div>
          <div className="inv-kpi-value">₹{kpis.totalStockValue.toLocaleString()}</div>
          <div className="inv-kpi-sub">{kpis.totalItemsTracked} ingredients tracked across branches</div>
        </div>

        <div className={`inv-kpi-card ${kpis.lowStockCount > 0 ? 'warning' : ''}`}>
          <div className="inv-kpi-header">
            <span className="inv-kpi-label">Low & Critical Stock Items</span>
            <span className="inv-kpi-icon">📉</span>
          </div>
          <div className="inv-kpi-value" style={{ color: kpis.criticalLowCount > 0 ? 'var(--color-error)' : 'inherit' }}>
            {kpis.criticalLowCount + kpis.lowStockCount}
          </div>
          <div className="inv-kpi-sub">{kpis.criticalLowCount} critical, {kpis.outOfStockCount} zero stock</div>
        </div>

        <div className={`inv-kpi-card ${kpis.expiringBatchesCount > 0 ? 'warning' : ''}`}>
          <div className="inv-kpi-header">
            <span className="inv-kpi-label">Batches Expiring (≤7 Days)</span>
            <span className="inv-kpi-icon">⏳</span>
          </div>
          <div className="inv-kpi-value" style={{ color: kpis.expiringBatchesCount > 0 ? 'var(--color-warning)' : 'inherit' }}>
            {kpis.expiringBatchesCount}
          </div>
          <div className="inv-kpi-sub">Priority for chef prep & menu specials</div>
        </div>

        <div className="inv-kpi-card">
          <div className="inv-kpi-header">
            <span className="inv-kpi-label">Active Purchase Orders</span>
            <span className="inv-kpi-icon">📦</span>
          </div>
          <div className="inv-kpi-value">{kpis.activeOrderedPOs}</div>
          <div className="inv-kpi-sub">{kpis.pendingApprovalPOs} pending executive approval</div>
        </div>

        <div className="inv-kpi-card">
          <div className="inv-kpi-header">
            <span className="inv-kpi-label">In-Transit Transfers</span>
            <span className="inv-kpi-icon">🚚</span>
          </div>
          <div className="inv-kpi-value">{kpis.inTransitTransfers}</div>
          <div className="inv-kpi-sub">Branch logistics & movements active</div>
        </div>

        <div className="inv-kpi-card danger">
          <div className="inv-kpi-header">
            <span className="inv-kpi-label">Recorded Spoilage / Loss</span>
            <span className="inv-kpi-icon">🗑️</span>
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
              + Create PO
            </button>
          </div>
          <div className="inv-card-body" style={{ padding: 0 }}>
            {lowStockItems.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                ✅ All branch ingredient stock levels are currently healthy!
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
                      <td>
                        <strong>{item.name}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{item.sku}</div>
                      </td>
                      <td>
                        <strong style={{ color: item.status.qty <= 0 ? 'var(--color-error)' : 'inherit' }}>
                          {item.status.qty} {item.baseUnit}
                        </strong>
                      </td>
                      <td>{item.minThreshold} {item.baseUnit}</td>
                      <td><StockBadge status={item.status} /></td>
                      <td>
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
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                ✅ No ingredient batches expiring within the next 7 days.
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
                      <td><strong>{b.batchNumber}</strong></td>
                      <td>{b.ingredientName}</td>
                      <td>{b.qty} {b.unit}</td>
                      <td>{b.expiryDate}</td>
                      <td>
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
          <h3>Quick Logistics & Procurement Actions</h3>
          <p>Common inventory workflows for restaurant branch operations</p>
        </div>
        <div className="inv-card-body">
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="inv-btn inv-btn-primary"
              onClick={() => onNavigate('inv-ingredients')}
            >
              🥬 Manage Ingredients & Stock Counts
            </button>
            <button
              type="button"
              className="inv-btn inv-btn-gold"
              onClick={() => onNavigate('inv-orders')}
            >
              📝 Purchase Orders & Receive Goods (GRN)
            </button>
            <button
              type="button"
              className="inv-btn inv-btn-secondary"
              onClick={() => onNavigate('inv-transfers')}
            >
              🔄 Dispatch Inter-Branch Transfer
            </button>
            <button
              type="button"
              className="inv-btn inv-btn-secondary"
              onClick={() => onNavigate('inv-wastage')}
            >
              🗑️ Log Wastage & Spoilage Write-Off
            </button>
            <button
              type="button"
              className="inv-btn inv-btn-secondary"
              onClick={() => onNavigate('inv-reports')}
            >
              📈 Run FIFO / Weighted Avg Valuation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
