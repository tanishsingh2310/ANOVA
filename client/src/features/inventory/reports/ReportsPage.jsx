import { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Download,
  BarChart3,
  FileSpreadsheet
} from 'lucide-react';
import { AnalyticsService } from '../services/analyticsService';
import { InventoryService } from '../services/inventoryService';

export default function ReportsPage({ branchId, branches = [] }) {
  const [reportType, setReportType] = useState('VALUATION'); // VALUATION, LOW_STOCK, EXPIRY, AUDIT_TRAIL
  const [valuationMethod, setValuationMethod] = useState('FIFO'); // FIFO or WEIGHTED_AVG
  const [selectedBranch, setSelectedBranch] = useState(branchId || 'all');
  const [search, setSearch] = useState('');

  const [valuationData, setValuationData] = useState(null);
  const [movements, setMovements] = useState([]);
  const [expiringBatches, setExpiringBatches] = useState([]);
  const [lowStockList, setLowStockList] = useState([]);

  const [notice, setNotice] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setSelectedBranch(branchId);
  }, [branchId]);

  const loadData = async (refresh = false) => {
    const val = AnalyticsService.getInventoryValuation(selectedBranch, valuationMethod);
    setValuationData(val);

    const movs = InventoryService.getMovements({ branchId: selectedBranch });
    setMovements(movs);

    const exp = InventoryService.getExpiringBatches(14, selectedBranch);
    setExpiringBatches(exp);

    const ings = InventoryService.getIngredients({ branchId: selectedBranch });
    const low = ings
      .map(i => ({
        ...i,
        status: InventoryService.calculateStockStatus(i, selectedBranch)
      }))
      .filter(i => i.status.level === 'CRITICAL' || i.status.level === 'LOW_STOCK' || i.status.level === 'OUT_OF_STOCK');
    setLowStockList(low);

    setIsSyncing(true);
    try {
      const [remoteVal, remoteMovs, remoteExp, remoteIngs] = await Promise.all([
        AnalyticsService.fetchValuationRemote(selectedBranch, valuationMethod),
        InventoryService.getMovementsRemote({ branchId: selectedBranch }),
        InventoryService.getExpiringBatchesRemote(14, selectedBranch),
        InventoryService.syncFromBackend(selectedBranch)
      ]);

      if (remoteVal) setValuationData(remoteVal);
      if (remoteMovs) setMovements(remoteMovs);
      if (remoteExp) setExpiringBatches(remoteExp);
      if (remoteIngs) {
        const freshLow = remoteIngs
          .map(i => ({
            ...i,
            status: InventoryService.calculateStockStatus(i, selectedBranch)
          }))
          .filter(i => i.status.level === 'CRITICAL' || i.status.level === 'LOW_STOCK' || i.status.level === 'OUT_OF_STOCK');
        setLowStockList(freshLow);
      }
      if (refresh) setNotice('Report data updated.');
    } catch (err) {
      console.warn('Reports sync error:', err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranch, valuationMethod]);

  const handleExport = () => {
    if (reportType === 'VALUATION' && valuationData) {
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
      AnalyticsService.downloadCSV(`ANOVA_Valuation_${valuationMethod}_${selectedBranch}`, csv);
      setNotice('Valuation report exported.');
    } else if (reportType === 'LOW_STOCK') {
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
      AnalyticsService.downloadCSV(`ANOVA_Low_Stock_Action_List_${selectedBranch}`, csv);
      setNotice('Low stock report exported.');
    } else if (reportType === 'EXPIRY') {
      const headers = [
        { label: 'Batch #', key: 'batchNumber' },
        { label: 'Ingredient', key: 'ingredientName' },
        { label: 'SKU', key: 'sku' },
        { label: 'Branch ID', key: 'branchId' },
        { label: 'Quantity', key: 'qty' },
        { label: 'Unit', key: 'unit' },
        { label: 'Expiry Date', key: 'expiryDate' },
        { label: 'Days Remaining', key: 'diffDays' }
      ];
      const csv = AnalyticsService.generateCSV(headers, expiringBatches);
      AnalyticsService.downloadCSV(`ANOVA_Expiry_Horizon_14Days_${selectedBranch}`, csv);
      setNotice('Expiry report exported.');
    } else if (reportType === 'AUDIT_TRAIL') {
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
      AnalyticsService.downloadCSV(`ANOVA_Stock_Movements_Audit_${selectedBranch}`, csv);
      setNotice('Movement audit trail exported.');
    }
  };

  const branchMap = {};
  branches.forEach(b => { branchMap[b.id || b._id] = b.name; });

  return (
    <div className="employees-page">
      {/* Heading matching Images 1-4 */}
      <div className="employees-heading">
        <div>
          <h2>Reports & Analytics</h2>
          <p>Generate valuation audits, movement ledgers, and export analytics.</p>
        </div>

        <div className="employees-heading-actions">
          <button
            type="button"
            className="employees-button employees-button-primary"
            onClick={handleExport}
          >
            <Download size={16} />
            + Export CSV
          </button>
          <button
            type="button"
            className="employees-button employees-button-secondary"
            onClick={() => loadData(true)}
            disabled={isSyncing}
          >
            <RefreshCw size={16} className={isSyncing ? 'employees-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {notice && (
        <div className="employees-notice" role="status">
          {notice}
        </div>
      )}

      {/* Filter Toolbar matching Images 1-4 */}
      <div className="employees-toolbar">
        <label className="employees-search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search report items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <label className="employees-filter">
          <span>Report Type</span>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="VALUATION">Inventory Valuation</option>
            <option value="LOW_STOCK">Low Stock Shortage Alert</option>
            <option value="EXPIRY">14-Day Batch Expiry Horizon</option>
            <option value="AUDIT_TRAIL">Complete Stock Movement Ledger</option>
          </select>
        </label>

        {reportType === 'VALUATION' && (
          <label className="employees-filter">
            <span>Costing Method</span>
            <select
              value={valuationMethod}
              onChange={(e) => setValuationMethod(e.target.value)}
            >
              <option value="FIFO">FIFO (First-In, First-Out)</option>
              <option value="WEIGHTED_AVG">Weighted Moving Average</option>
            </select>
          </label>
        )}

        <label className="employees-filter">
          <span>Branch</span>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="all">All branches</option>
            {branches.map((b) => (
              <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Table Card matching People & HR */}
      <div className="employees-table-card">
        {/* REPORT 1: VALUATION */}
        {reportType === 'VALUATION' && (
          <>
            <div className="employees-table-heading">
              <div>
                <h3>Inventory Portfolio Valuation ({valuationMethod})</h3>
                <p>
                  Total Value: ₹{(valuationData?.totalPortfolioValue || 0).toLocaleString()} • Location: {selectedBranch === 'all' ? 'Enterprise All Branches' : selectedBranch}
                </p>
              </div>
            </div>

            {(!valuationData || !valuationData.items || valuationData.items.length === 0) ? (
              <div className="employees-empty-state">
                <FileSpreadsheet size={26} />
                <h3>No valuation records found</h3>
                <p>No inventory items registered in the active branch.</p>
              </div>
            ) : (
              <div className="employees-table-scroll">
                <table className="employees-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Ingredient</th>
                      <th>Category</th>
                      <th>Branch Stock</th>
                      <th>Unit</th>
                      <th>Calculated Unit Cost</th>
                      <th>Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(valuationData.items || [])
                      .filter(row => !search || row.name.toLowerCase().includes(search.toLowerCase()) || row.sku.toLowerCase().includes(search.toLowerCase()))
                      .map((row) => (
                        <tr key={row.id}>
                          <td><code>{row.sku}</code></td>
                          <td><strong>{row.name}</strong></td>
                          <td>{row.category}</td>
                          <td><strong>{row.quantity}</strong></td>
                          <td>{row.baseUnit}</td>
                          <td>₹{row.unitCost}</td>
                          <td>
                            <strong>₹{((row.totalValue ?? row.valuation) || 0).toLocaleString()}</strong>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* REPORT 2: LOW STOCK */}
        {reportType === 'LOW_STOCK' && (
          <>
            <div className="employees-table-heading">
              <div>
                <h3>Stock Shortage & Reorder Deficit</h3>
                <p>{lowStockList.length} items breaching minimum threshold buffers</p>
              </div>
            </div>

            {lowStockList.length === 0 ? (
              <div className="employees-empty-state">
                <BarChart3 size={26} />
                <h3>No stock shortages detected</h3>
                <p>All items are operating with adequate buffer inventory.</p>
              </div>
            ) : (
              <div className="employees-table-scroll">
                <table className="employees-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Ingredient</th>
                      <th>Current Stock</th>
                      <th>Min Safety Buffer</th>
                      <th>Reorder Level</th>
                      <th>Shortage Deficit</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockList
                      .filter(item => !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.sku.toLowerCase().includes(search.toLowerCase()))
                      .map((item) => {
                        const deficit = Math.max(0, item.minThreshold - item.status.qty);
                        return (
                          <tr key={item.id}>
                            <td><code>{item.sku}</code></td>
                            <td><strong>{item.name}</strong></td>
                            <td style={{ color: '#b91c1c', fontWeight: 700 }}>
                              {item.status.qty} {item.baseUnit}
                            </td>
                            <td>{item.minThreshold} {item.baseUnit}</td>
                            <td>{item.reorderLevel} {item.baseUnit}</td>
                            <td style={{ color: '#b91c1c', fontWeight: 700 }}>
                              +{deficit} {item.baseUnit}
                            </td>
                            <td>
                              <span className={`employees-status ${item.status.level === 'OUT_OF_STOCK' || item.status.level === 'CRITICAL' ? 'is-danger' : 'is-warning'}`}>
                                {item.status.text}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* REPORT 3: EXPIRY FORECAST */}
        {reportType === 'EXPIRY' && (
          <>
            <div className="employees-table-heading">
              <div>
                <h3>Batch Expiry Horizon (Next 14 Days)</h3>
                <p>{expiringBatches.length} perishable batches requiring priority preparation</p>
              </div>
            </div>

            {expiringBatches.length === 0 ? (
              <div className="employees-empty-state">
                <BarChart3 size={26} />
                <h3>No expiring batches found</h3>
                <p>No batches nearing expiration within the next 14 days.</p>
              </div>
            ) : (
              <div className="employees-table-scroll">
                <table className="employees-table">
                  <thead>
                    <tr>
                      <th>Batch Code</th>
                      <th>Ingredient</th>
                      <th>Branch</th>
                      <th>Quantity</th>
                      <th>Expiry Date</th>
                      <th>Days Left</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiringBatches
                      .filter(b => !search || b.ingredientName.toLowerCase().includes(search.toLowerCase()) || b.batchNumber.toLowerCase().includes(search.toLowerCase()))
                      .map((b) => (
                        <tr key={b.batchNumber}>
                          <td><code>{b.batchNumber}</code></td>
                          <td><strong>{b.ingredientName}</strong></td>
                          <td>{branchMap[b.branchId] || b.branchId}</td>
                          <td><strong>{b.qty} {b.unit}</strong></td>
                          <td>{b.expiryDate}</td>
                          <td>{b.diffDays <= 0 ? 'Expired' : `${b.diffDays} day(s)`}</td>
                          <td>
                            <span className={`employees-status ${b.isExpired ? 'is-danger' : 'is-warning'}`}>
                              {b.isExpired ? 'DISCARD REQUIRED' : 'USE FIRST (FIFO)'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* REPORT 4: MOVEMENT AUDIT TRAIL */}
        {reportType === 'AUDIT_TRAIL' && (
          <>
            <div className="employees-table-heading">
              <div>
                <h3>Stock Movement Audit Ledger</h3>
                <p>{movements.length} logged stock transactions and adjustments</p>
              </div>
            </div>

            {movements.length === 0 ? (
              <div className="employees-empty-state">
                <BarChart3 size={26} />
                <h3>No movement records found</h3>
                <p>No stock changes recorded yet for this branch.</p>
              </div>
            ) : (
              <div className="employees-table-scroll">
                <table className="employees-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Event Type</th>
                      <th>Reference</th>
                      <th>Delta Qty</th>
                      <th>Balance</th>
                      <th>Auditor</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements
                      .filter(m => !search || (m.reference || '').toLowerCase().includes(search.toLowerCase()) || (m.notes || '').toLowerCase().includes(search.toLowerCase()))
                      .map((m) => (
                        <tr key={m.id}>
                          <td>{m.timestamp ? m.timestamp.replace('T', ' ').slice(0, 16) : '-'}</td>
                          <td>
                            <span className={`employees-status ${m.deltaQty >= 0 ? 'is-active' : 'is-warning'}`}>
                              {m.type}
                            </span>
                          </td>
                          <td><code>{m.reference}</code></td>
                          <td style={{ color: m.deltaQty >= 0 ? '#287544' : '#b91c1c', fontWeight: 700 }}>
                            {m.deltaQty >= 0 ? `+${m.deltaQty}` : m.deltaQty} {m.unit}
                          </td>
                          <td><strong>{m.resultingBalance} {m.unit}</strong></td>
                          <td>{m.performedBy || m.user || 'Storekeeper'}</td>
                          <td>{m.notes || '—'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
