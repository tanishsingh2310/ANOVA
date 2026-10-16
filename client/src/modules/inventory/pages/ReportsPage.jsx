import { useState, useEffect } from 'react';
import { AnalyticsService } from '../services/analyticsService';
import { InventoryService } from '../services/inventoryService';

export default function ReportsPage({ branchId, branches = [] }) {
  const [reportType, setReportType] = useState('VALUATION'); // VALUATION, LOW_STOCK, EXPIRY, AUDIT_TRAIL
  const [valuationMethod, setValuationMethod] = useState('FIFO'); // FIFO or WEIGHTED_AVG
  const [valuationData, setValuationData] = useState(null);
  const [movements, setMovements] = useState([]);
  const [expiringBatches, setExpiringBatches] = useState([]);
  const [lowStockList, setLowStockList] = useState([]);

  const loadData = () => {
    // Valuation
    const val = AnalyticsService.getInventoryValuation(branchId, valuationMethod);
    setValuationData(val);

    // Audit movements
    const movs = InventoryService.getMovements({ branchId });
    setMovements(movs);

    // Expiring batches
    const exp = InventoryService.getExpiringBatches(14, branchId);
    setExpiringBatches(exp);

    // Low stock
    const ings = InventoryService.getIngredients({ branchId });
    const low = ings
      .map(i => ({
        ...i,
        status: InventoryService.calculateStockStatus(i, branchId)
      }))
      .filter(i => i.status.level === 'CRITICAL' || i.status.level === 'LOW_STOCK' || i.status.level === 'OUT_OF_STOCK');
    setLowStockList(low);
  };

  useEffect(() => {
    loadData();
  }, [branchId, valuationMethod]);

  // CSV Export Handlers
  const handleExportValuation = () => {
    if (!valuationData) return;
    const headers = [
      { label: 'SKU', key: 'sku' },
      { label: 'Ingredient Name', key: 'name' },
      { label: 'Category', key: 'category' },
      { label: 'Stock Qty', key: 'quantity' },
      { label: 'Unit', key: 'baseUnit' },
      { label: 'Costing Method', key: 'valuationMethod' },
      { label: 'Unit Cost (INR)', key: 'unitCost' },
      { label: 'Total Value (INR)', key: 'totalValue' }
    ];
    const csv = AnalyticsService.generateCSV(headers, valuationData.items);
    AnalyticsService.downloadCSV(`ANOVA_Valuation_${valuationMethod}_${branchId}`, csv);
  };

  const handleExportMovements = () => {
    const headers = [
      { label: 'Timestamp', key: 'timestamp' },
      { label: 'Movement Type', key: 'type' },
      { label: 'Reference Code', key: 'reference' },
      { label: 'Ingredient ID', key: 'ingredientId' },
      { label: 'Branch ID', key: 'branchId' },
      { label: 'Delta Qty', key: 'deltaQty' },
      { label: 'Unit', key: 'unit' },
      { label: 'Resulting Balance', key: 'resultingBalance' },
      { label: 'Auditor', key: 'performedBy' },
      { label: 'Notes', key: 'notes' }
    ];
    const csv = AnalyticsService.generateCSV(headers, movements);
    AnalyticsService.downloadCSV(`ANOVA_Stock_Movements_Audit_${branchId}`, csv);
  };

  const handleExportLowStock = () => {
    const headers = [
      { label: 'SKU', key: 'sku' },
      { label: 'Ingredient', key: 'name' },
      { label: 'Category', key: 'category' },
      { label: 'Current Qty', key: 'currentQty' },
      { label: 'Unit', key: 'baseUnit' },
      { label: 'Min Threshold', key: 'minThreshold' },
      { label: 'Reorder Level', key: 'reorderLevel' },
      { label: 'Stock Status', key: 'statusLevel' }
    ];
    const rows = lowStockList.map(item => ({
      sku: item.sku,
      name: item.name,
      category: item.category,
      currentQty: item.status.qty,
      baseUnit: item.baseUnit,
      minThreshold: item.minThreshold,
      reorderLevel: item.reorderLevel,
      statusLevel: item.status.level
    }));
    const csv = AnalyticsService.generateCSV(headers, rows);
    AnalyticsService.downloadCSV(`ANOVA_LowStock_Reorder_Schedule_${branchId}`, csv);
  };

  const branchMap = {};
  branches.forEach(b => { branchMap[b.id] = b.name; });

  return (
    <div className="inv-reports-page">
      {/* Sub Report Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`inv-btn ${reportType === 'VALUATION' ? 'inv-btn-primary' : 'inv-btn-secondary'}`}
          onClick={() => setReportType('VALUATION')}
        >
          Stock Valuation (FIFO / Weighted Avg)
        </button>
        <button
          type="button"
          className={`inv-btn ${reportType === 'LOW_STOCK' ? 'inv-btn-primary' : 'inv-btn-secondary'}`}
          onClick={() => setReportType('LOW_STOCK')}
        >
          Low Stock & Reorder Schedule
        </button>
        <button
          type="button"
          className={`inv-btn ${reportType === 'EXPIRY' ? 'inv-btn-primary' : 'inv-btn-secondary'}`}
          onClick={() => setReportType('EXPIRY')}
        >
          Batch Expiry Forecast (14 Days)
        </button>
        <button
          type="button"
          className={`inv-btn ${reportType === 'AUDIT_TRAIL' ? 'inv-btn-primary' : 'inv-btn-secondary'}`}
          onClick={() => setReportType('AUDIT_TRAIL')}
        >
          Stock Movement Audit Trail
        </button>
      </div>

      {/* REPORT 1: STOCK VALUATION */}
      {reportType === 'VALUATION' && valuationData && (
        <div className="inv-card">
          <div className="inv-card-header">
            <div>
              <h3>Enterprise Inventory Valuation Ledger</h3>
              <p>Branch: {valuationData.branchName} • Generated: {valuationData.generatedAt.split('T')[0]}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                className="inv-select"
                value={valuationMethod}
                onChange={(e) => setValuationMethod(e.target.value)}
                aria-label="Costing method"
              >
                <option value="FIFO">Method: FIFO (First-In, First-Out)</option>
                <option value="WEIGHTED_AVG">Method: Weighted Average Costing</option>
              </select>

              <button
                type="button"
                className="inv-btn inv-btn-sm inv-btn-gold"
                onClick={handleExportValuation}
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="inv-card-body" style={{ padding: '16px 24px', background: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>TOTAL PORTFOLIO VALUATION ({valuationMethod})</span>
                <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--anova-forest-green)', fontFamily: 'var(--font-display)' }}>
                  ₹{valuationData.totalPortfolioValue.toLocaleString()}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'right' }}>
                Costing Method Grounding: <strong style={{ color: 'var(--anova-forest-green)' }}>{valuationMethod === 'FIFO' ? 'Oldest Batch Depletion' : 'Batch Value Weighted Average'}</strong>
              </div>
            </div>
          </div>

          <div className="inv-card-body" style={{ padding: 0 }}>
            <div className="inv-table-wrapper">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th style={{ width: '130px', whiteSpace: 'nowrap' }}>SKU</th>
                    <th>Ingredient</th>
                    <th>Category</th>
                    <th>Branch Stock</th>
                    <th>Unit</th>
                    <th>Calculated Unit Cost</th>
                    <th>Total Inventory Value</th>
                  </tr>
                </thead>
                <tbody>
                  {valuationData.items.map(row => (
                    <tr key={row.id}>
                      <td className="inv-cell-code"><code>{row.sku}</code></td>
                      <td><strong>{row.name}</strong></td>
                      <td className="inv-cell-nowrap">{row.category}</td>
                      <td className="inv-cell-nowrap"><strong>{row.quantity}</strong></td>
                      <td className="inv-cell-nowrap">{row.baseUnit}</td>
                      <td className="inv-cell-amount">₹{row.unitCost}</td>
                      <td className="inv-cell-amount"><strong>₹{row.totalValue.toLocaleString()}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 2: LOW STOCK */}
      {reportType === 'LOW_STOCK' && (
        <div className="inv-card">
          <div className="inv-card-header">
            <div>
              <h3>Stock Shortage & Reorder Recommendation</h3>
              <p>Items reaching or breaching minimum safety buffer</p>
            </div>
            <button
              type="button"
              className="inv-btn inv-btn-sm inv-btn-gold"
              onClick={handleExportLowStock}
            >
              Export CSV
            </button>
          </div>
          <div className="inv-card-body" style={{ padding: 0 }}>
            <div className="inv-table-wrapper">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th style={{ width: '130px', whiteSpace: 'nowrap' }}>SKU</th>
                    <th>Ingredient</th>
                    <th>Current Stock</th>
                    <th>Safety Buffer (Min)</th>
                    <th>Reorder Trigger</th>
                    <th>Shortage Deficit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockList.map(item => {
                    const deficit = Math.max(0, item.minThreshold - item.status.qty);
                    return (
                      <tr key={item.id}>
                        <td className="inv-cell-code"><code>{item.sku}</code></td>
                        <td><strong>{item.name}</strong></td>
                        <td className="inv-cell-nowrap"><strong style={{ color: 'var(--color-error)' }}>{item.status.qty} {item.baseUnit}</strong></td>
                        <td className="inv-cell-nowrap">{item.minThreshold} {item.baseUnit}</td>
                        <td className="inv-cell-nowrap">{item.reorderLevel} {item.baseUnit}</td>
                        <td className="inv-cell-nowrap"><strong style={{ color: 'var(--color-error)' }}>+{deficit} {item.baseUnit}</strong></td>
                        <td className="inv-cell-badge">
                          <span className={`inv-badge ${item.status.level === 'OUT_OF_STOCK' || item.status.level === 'CRITICAL' ? 'inv-badge-danger' : 'inv-badge-warning'}`}>
                            {item.status.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 3: EXPIRY FORECAST */}
      {reportType === 'EXPIRY' && (
        <div className="inv-card">
          <div className="inv-card-header">
            <div>
              <h3>Batch Expiry Horizon (Next 14 Days)</h3>
              <p>Schedule of perishables to prioritize for daily recipes</p>
            </div>
          </div>
          <div className="inv-card-body" style={{ padding: 0 }}>
            <div className="inv-table-wrapper">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th style={{ width: '130px', whiteSpace: 'nowrap' }}>Batch #</th>
                    <th>Ingredient</th>
                    <th>Branch Location</th>
                    <th>Quantity</th>
                    <th style={{ width: '110px', whiteSpace: 'nowrap' }}>Expiry Date</th>
                    <th>Days Remaining</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {expiringBatches.map(b => (
                    <tr key={b.batchNumber}>
                      <td className="inv-cell-code"><code>{b.batchNumber}</code></td>
                      <td>{b.ingredientName}</td>
                      <td className="inv-cell-nowrap">{branchMap[b.branchId] || b.branchId}</td>
                      <td className="inv-cell-nowrap"><strong>{b.qty} {b.unit}</strong></td>
                      <td className="inv-cell-date">{b.expiryDate}</td>
                      <td className="inv-cell-nowrap">{b.diffDays <= 0 ? 'Expired' : `${b.diffDays} day(s)`}</td>
                      <td className="inv-cell-badge">
                        <span className={`inv-badge ${b.isExpired ? 'inv-badge-danger' : 'inv-badge-warning'}`}>
                          {b.isExpired ? 'DISCARD REQUIRED' : 'USE FIRST (FIFO)'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 4: MOVEMENT AUDIT TRAIL */}
      {reportType === 'AUDIT_TRAIL' && (
        <div className="inv-card">
          <div className="inv-card-header">
            <div>
              <h3>Stock Movement & Transaction Audit Trail</h3>
              <p>Tamper-evident log of all receipts, transfers, adjustments and spoilage</p>
            </div>
            <button
              type="button"
              className="inv-btn inv-btn-sm inv-btn-gold"
              onClick={handleExportMovements}
            >
              Export CSV
            </button>
          </div>
          <div className="inv-card-body" style={{ padding: 0 }}>
            <div className="inv-table-wrapper">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th style={{ width: '130px', whiteSpace: 'nowrap' }}>Timestamp</th>
                    <th>Type</th>
                    <th style={{ width: '130px', whiteSpace: 'nowrap' }}>Reference</th>
                    <th>Delta Change</th>
                    <th>Resulting Stock</th>
                    <th>Performed By</th>
                    <th>Audit Details</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map(m => (
                    <tr key={m.id}>
                      <td className="inv-cell-date">
                        {m.timestamp.replace('T', ' ').slice(0, 16)}
                      </td>
                      <td className="inv-cell-badge">
                        <span className="inv-badge inv-badge-info">
                          {m.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="inv-cell-code"><code>{m.reference}</code></td>
                      <td className="inv-cell-nowrap">
                        <strong style={{ color: m.deltaQty < 0 ? 'var(--color-error)' : 'var(--color-success)' }}>
                          {m.deltaQty > 0 ? `+${m.deltaQty}` : m.deltaQty} {m.unit}
                        </strong>
                      </td>
                      <td className="inv-cell-nowrap"><strong>{m.resultingBalance} {m.unit}</strong></td>
                      <td className="inv-cell-nowrap">{m.performedBy}</td>
                      <td style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>{m.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
