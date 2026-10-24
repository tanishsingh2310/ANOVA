import { useState, useEffect } from 'react';
import InventoryNav from './components/InventoryNav';
import InventoryDashboard from './dashboard/InventoryDashboard';
import IngredientsPage from './ingredients/IngredientsPage';
import SuppliersPage from './suppliers/SuppliersPage';
import PurchaseOrdersPage from './orders/PurchaseOrdersPage';
import TransfersPage from './transfers/TransfersPage';
import WastagePage from './wastage/WastagePage';
import ReportsPage from './reports/ReportsPage';
import { InventoryService } from './services/inventoryService';
import { AnalyticsService } from './services/analyticsService';
import '../../styles/inventory.css';

// One-time cleanup of legacy frontend mock stores (transfers, movements, POs)
const MOCK_PURGE_FLAG = 'anova_inv_mock_purged_v1';
if (typeof window !== 'undefined' && !localStorage.getItem(MOCK_PURGE_FLAG)) {
  try {
    localStorage.removeItem('anova_inventory_transfers');
    localStorage.removeItem('anova_inventory_movements');
    localStorage.removeItem('anova_inventory_pos');
    localStorage.setItem(MOCK_PURGE_FLAG, 'true');
  } catch (err) {
    console.warn('Error purging mock stores:', err);
  }
}

export default function InventoryModule({
  activeSubpage = 'inv-dashboard',
  onSubpageChange = () => {},
  selectedBranch = 'all',
  showSubnav = false
}) {
  const [currentTab, setCurrentTab] = useState(activeSubpage);
  const [branches, setBranches] = useState([]);
  const [alertsCount, setAlertsCount] = useState(0);

  useEffect(() => {
    setCurrentTab(activeSubpage);
  }, [activeSubpage]);

  useEffect(() => {
    InventoryService.getBranchesRemote().then(b => { if (b && b.length > 0) setBranches(b); else setBranches(InventoryService.getBranches()); }).catch(() => setBranches(InventoryService.getBranches()));
    try {
      const kpis = AnalyticsService.getDashboardKPIs(selectedBranch);
      setAlertsCount(kpis?.totalAlerts || 0);
    } catch {
      setAlertsCount(0);
    }
  }, [selectedBranch]);

  const handleTabChange = (tabId) => {
    setCurrentTab(tabId);
    onSubpageChange(tabId);
  };

  return (
    <div className="anova-inventory-module">
      {/* Sub-Navigation Tabs */}
      {showSubnav && (
        <InventoryNav
          activeTab={currentTab}
          onTabChange={handleTabChange}
          alertsCount={alertsCount}
        />
      )}
      {currentTab === 'inv-dashboard' && (
        <InventoryDashboard
          branchId={selectedBranch}
          branches={branches}
          onNavigate={handleTabChange}
        />
      )}

      {currentTab === 'inv-ingredients' && (
        <IngredientsPage
          branchId={selectedBranch}
          branches={branches}
        />
      )}

      {currentTab === 'inv-suppliers' && (
        <SuppliersPage />
      )}

      {currentTab === 'inv-orders' && (
        <PurchaseOrdersPage
          branchId={selectedBranch}
          branches={branches}
        />
      )}

      {currentTab === 'inv-transfers' && (
        <TransfersPage
          branchId={selectedBranch}
          branches={branches}
        />
      )}

      {currentTab === 'inv-wastage' && (
        <WastagePage
          branchId={selectedBranch}
          branches={branches}
        />
      )}

      {currentTab === 'inv-reports' && (
        <ReportsPage
          branchId={selectedBranch}
          branches={branches}
        />
      )}
    </div>
  );
}
