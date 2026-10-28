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
import InventoryPagination from '../components/InventoryPagination';

export default function ReportsPage({ branchId, branches = [] }) {
  const [reportType, setReportType] = useState('VALUATION'); // VALUATION, LOW_STOCK, EXPIRY, AUDIT_TRAIL
  const [valuationMethod, setValuationMethod] = useState('FIFO'); // FIFO or WEIGHTED_AVG
  const [selectedBranch, setSelectedBranch] = useState(branchId || 'all');
  const [search, setSearch] = useState('');

  const [valuationData, setValuationData] = useState(() => AnalyticsService.getInventoryValuation(branchId || 'all', 'FIFO', branches));
  const [movements, setMovements] = useState([]);
  const [expiringBatches, setExpiringBatches] = useState(() => InventoryService.getExpiringBatches(14, branchId || 'all'));
  const [lowStockList, setLowStockList] = useState(() => {
    const ings = InventoryService.getIngredients({ branchId: branchId || 'all' }, branches);
    return (Array.isArray(ings) ? ings : [])
      .map(i => ({ ...i, status: InventoryService.calculateStockStatus(i, branchId || 'all', branches) }))
      .filter(i => i.status.level === 'CRITICAL' || i.status.level === 'LOW_STOCK' || i.status.level === 'OUT_OF_STOCK');
  });

  const [notice, setNotice] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [reportType, search, selectedBranch, valuationMethod]);

  useEffect(() => {
    setSelectedBranch(branchId);
  }, [branchId]);

  const loadData = async (refresh = false) => {
    setIsSyncing(true);
    try {
      const [valResult, movsResult, expResult, ingsResult] = await Promise.allSettled([
        AnalyticsService.fetchValuationRemote(selectedBranch, valuationMethod),
        InventoryService.getMovementsRemote({ branchId: selectedBranch }),
        InventoryService.getExpiringBatchesRemote(14, selectedBranch),
        InventoryService.syncFromBackend(selectedBranch)
      ]);

      if (valResult.status === 'fulfilled' && valResult.value) {
        setValuationData(valResult.value);
      } else {
        setValuationData(AnalyticsService.getInventoryValuation(selectedBranch, valuationMethod, branches));
      }

      if (movsResult.status === 'fulfilled' && Array.isArray(movsResult.value)) {
        setMovements(movsResult.value);
      }

      if (expResult.status === 'fulfilled' && Array.isArray(expResult.value)) {
        setExpiringBatches(expResult.value);
      } else {
        setExpiringBatches(InventoryService.getExpiringBatches(14, selectedBranch));
      }

      const freshIngs = (ingsResult.status === 'fulfilled' && Array.isArray(ingsResult.value))
        ? ingsResult.value
        : InventoryService.getIngredients({ branchId: selectedBranch }, branches);

      const freshLow = (freshIngs || [])
        .map(i => ({
          ...i,
          status: InventoryService.calculateStockStatus(i, selectedBranch, branches)
        }))
        .filter(i => i.status.level === 'CRITICAL' || i.status.level === 'LOW_STOCK' || i.status.level === 'OUT_OF_STOCK');
      setLowStockList(freshLow);

      if (refresh) setNotice('Report data updated.');
    } catch (err) {
      console.error('Reports sync error:', err.message);
      setValuationData(AnalyticsService.getInventoryValuation(selectedBranch, valuationMethod, branches));
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranch, valuationMethod]);

  const handleExport = () => {
    const q = (search || '').toLowerCase().trim();

    if (reportType === 'VALUATION' && valuationData) {
      const items = (valuationData.items || []).filter(row =>
        !q ||
        (row.name || '').toLowerCase().includes(q) ||
        (row.sku || '').toLowerCase().includes(q) ||
        (row.category || '').toLowerCase().includes(q)
      );
      if (items.length === 0) {
        setNotice('No matching valuation records to export.');
        return;
      }
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
      const csv = AnalyticsService.generateCSV(headers, items);
      AnalyticsService.downloadCSV(`ANOVA_Valuation_${valuationMethod}_${selectedBranch}`, csv);
      setNotice('Valuation report exported.');
    } else if (reportType === 'LOW_STOCK') {
      const rows = lowStockList
        .filter(item =>
          !q ||
          (item.name || '').toLowerCase().includes(q) ||
          (item.sku || '').toLowerCase().includes(q) ||
          (item.category || '').toLowerCase().includes(q)
        )
        .map(item => ({
          sku: item.sku,
          name: item.name,
          category: item.category,
          currentQty: item.status?.qty || 0,
          baseUnit: item.baseUnit,
          minThreshold: item.minThreshold,
          reorderLevel: item.reorderLevel,
          statusLevel: item.status?.level || 'LOW_STOCK'
        }));
      if (rows.length === 0) {
        setNotice('No matching low stock records to export.');
        return;
      }
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
      const csv = AnalyticsService.generateCSV(headers, rows);
      AnalyticsService.downloadCSV(`ANOVA_Low_Stock_Action_List_${selectedBranch}`, csv);
      setNotice('Low stock report exported.');
    } else if (reportType === 'EXPIRY') {
      const rows = expiringBatches.filter(b =>
        !q ||
        (b.ingredientName || '').toLowerCase().includes(q) ||
        (b.batchNumber || '').toLowerCase().includes(q) ||
        (b.sku || '').toLowerCase().includes(q)
      );
      if (rows.length === 0) {
        setNotice('No matching expiry records to export.');
        return;
      }
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
      const csv = AnalyticsService.generateCSV(headers, rows);
      AnalyticsService.downloadCSV(`ANOVA_Expiry_Horizon_14Days_${selectedBranch}`, csv);
      setNotice('Expiry report exported.');
    } else if (reportType === 'AUDIT_TRAIL') {
      const rows = movements.filter(m =>
        !q ||
        (m.reference || '').toLowerCase().includes(q) ||
        (m.notes || '').toLowerCase().includes(q) ||
        (m.type || '').toLowerCase().includes(q) ||
        (m.performedBy || '').toLowerCase().includes(q)
      );
      if (rows.length === 0) {
        setNotice('No matching movement records to export.');
        return;
      }
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
      const csv = AnalyticsService.generateCSV(headers, rows);
      AnalyticsService.downloadCSV(`ANOVA_Stock_Movements_Audit_${selectedBranch}`, csv);
      setNotice('Movement audit trail exported.');
    }
  };

  const branchMap = {};
  if (Array.isArray(branches)) {
    branches.forEach(b => {
      if (!b) return;
      if (b.id) branchMap[b.id] = b.name;
      if (b._id) branchMap[String(b._id)] = b.name;
      if (b.code) {
        branchMap[b.code] = b.name;
        branchMap[b.code.toUpperCase()] = b.name;
        branchMap[b.code.toLowerCase()] = b.name;
      }
    });
  }

  return (
    <div className="employees-page">
      {/* Heading matching Images 1-4 */}
      <div className="employees-heading">
        <div>
          <p>Generate valuation audits, movement ledgers, and export analytics.</p>
        </div>

        <div className="employees-heading-actions">
          <button
            type="button"
            className="employees-button employees-button-primary"
            onClick={handleExport}
          >
            <Download size={16} />
            Export CSV
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
              <>
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
                      {(() => {
                        const q = (search || '').toLowerCase().trim();
                        const filtered = (valuationData.items || []).filter(row =>
                          !q ||
                          (row.name || '').toLowerCase().includes(q) ||
                          (row.sku || '').toLowerCase().includes(q) ||
                          (row.category || '').toLowerCase().includes(q)
                        );
                        return filtered
                          .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                          .map((row) => (
                            <tr key={row.id || row._id || row.sku}>
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
                          ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {(() => {
                  const q = (search || '').toLowerCase().trim();
                  const total = (valuationData.items || []).filter(row =>
                    !q ||
                    (row.name || '').toLowerCase().includes(q) ||
                    (row.sku || '').toLowerCase().includes(q) ||
                    (row.category || '').toLowerCase().includes(q)
                  ).length;
                  return (
                    <InventoryPagination
                      currentPage={currentPage}
                      totalItems={total}
                      pageSize={PAGE_SIZE}
                      onPageChange={setCurrentPage}
                    />
                  );
                })()}
              </>
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

            {(() => {
              const q = (search || '').toLowerCase().trim();
              const filtered = lowStockList.filter(item =>
                !q ||
                (item.name || '').toLowerCase().includes(q) ||
                (item.sku || '').toLowerCase().includes(q) ||
                (item.category || '').toLowerCase().includes(q)
              );

              if (filtered.length === 0) {
                return (
                  <div className="employees-empty-state">
                    <BarChart3 size={26} />
                    <h3>No stock shortages detected</h3>
                    <p>{search ? 'No low stock items matching your search.' : 'All items are operating with adequate buffer inventory.'}</p>
                  </div>
                );
              }

              const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

              return (
                <>
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
                        {paginated.map((item) => {
                          const deficit = Math.max(0, item.minThreshold - (item.status?.qty || 0));
                          return (
                            <tr key={item.id || item._id || item.sku}>
                              <td><code>{item.sku}</code></td>
                              <td><strong>{item.name}</strong></td>
                              <td style={{ color: '#b91c1c', fontWeight: 700 }}>
                                {item.status?.qty ?? 0} {item.baseUnit}
                              </td>
                              <td>{item.minThreshold} {item.baseUnit}</td>
                              <td>{item.reorderLevel} {item.baseUnit}</td>
                              <td style={{ color: '#b91c1c', fontWeight: 700 }}>
                                +{deficit} {item.baseUnit}
                              </td>
                              <td>
                                <span className={`employees-status ${item.status?.level === 'OUT_OF_STOCK' || item.status?.level === 'CRITICAL' ? 'is-danger' : 'is-warning'}`}>
                                  {item.status?.text || item.status?.level}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <InventoryPagination
                    currentPage={currentPage}
                    totalItems={filtered.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setCurrentPage}
                  />
                </>
              );
            })()}
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

            {(() => {
              const q = (search || '').toLowerCase().trim();
              const filtered = expiringBatches.filter(b =>
                !q ||
                (b.ingredientName || '').toLowerCase().includes(q) ||
                (b.batchNumber || '').toLowerCase().includes(q) ||
                (b.sku || '').toLowerCase().includes(q)
              );

              if (filtered.length === 0) {
                return (
                  <div className="employees-empty-state">
                    <BarChart3 size={26} />
                    <h3>No expiring batches found</h3>
                    <p>{search ? 'No expiring batches matching your search.' : 'No batches nearing expiration within the next 14 days.'}</p>
                  </div>
                );
              }

              const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

              return (
                <>
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
                        {paginated.map((b) => (
                          <tr key={b.id || b._id || b.batchNumber}>
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

                  <InventoryPagination
                    currentPage={currentPage}
                    totalItems={filtered.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setCurrentPage}
                  />
                </>
              );
            })()}
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
              <>
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
                      {(() => {
                        const q = (search || '').toLowerCase().trim();
                        const filtered = movements.filter(
                          m => !q ||
                            (m.reference || '').toLowerCase().includes(q) ||
                            (m.notes || '').toLowerCase().includes(q) ||
                            (m.type || '').toLowerCase().includes(q) ||
                            (m.performedBy || m.user || '').toLowerCase().includes(q)
                        );
                        return filtered
                          .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                          .map((m) => (
                            <tr key={m.id || m._id || m.reference}>
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
                          ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {(() => {
                  const q = (search || '').toLowerCase().trim();
                  const total = movements.filter(
                    m => !q ||
                      (m.reference || '').toLowerCase().includes(q) ||
                      (m.notes || '').toLowerCase().includes(q) ||
                      (m.type || '').toLowerCase().includes(q) ||
                      (m.performedBy || m.user || '').toLowerCase().includes(q)
                  ).length;
                  return (
                    <InventoryPagination
                      currentPage={currentPage}
                      totalItems={total}
                      pageSize={PAGE_SIZE}
                      onPageChange={setCurrentPage}
                    />
                  );
                })()}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
