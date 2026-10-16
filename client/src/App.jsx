import { useState, useEffect } from 'react';
import './styles/theme.css';
import './styles/layout.css';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import InventoryModule from './modules/inventory/InventoryModule';
import { AnalyticsService } from './modules/inventory/services/analyticsService';
import { InventoryService } from './modules/inventory/services/inventoryService';

export default function App() {
  const [activePage, setActivePage] = useState('inv-dashboard');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [branches, setBranches] = useState([]);
  const [alertsCount, setAlertsCount] = useState(0);

  useEffect(() => {
    const branchList = InventoryService.getBranches();
    setBranches(branchList);
    const kpis = AnalyticsService.getDashboardKPIs(selectedBranch);
    setAlertsCount(kpis.totalAlerts);
  }, [selectedBranch]);

  // Page title resolution
  const getPageTitle = () => {
    switch (activePage) {
      case 'inv-dashboard':
        return 'Inventory & Supply Chain Overview';
      case 'inv-ingredients':
        return 'Ingredients & Stock Management';
      case 'inv-suppliers':
        return 'Supplier & Vendor Directory';
      case 'inv-orders':
        return 'Procurement & Goods Receiving (GRN)';
      case 'inv-transfers':
        return 'Inter-Branch Stock Transfers';
      case 'inv-wastage':
        return 'Wastage & Spoilage Write-Offs';
      case 'inv-reports':
        return 'Inventory Valuation & Audit Reports';
      default:
        return 'Inventory & Supply Chain Overview';
    }
  };

  const getBreadcrumb = () => {
    return 'ANOVA / INVENTORY & SUPPLY CHAIN';
  };

  const getPageSubtitle = () => {
    return 'Enterprise inventory control, procurement lifecycle, and branch logistics';
  };

  return (
    <div className="anova-app-shell">
      {/* Pinned Shared Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        alertsCount={alertsCount}
      />

      {/* Main Content Area */}
      <main className="anova-main">
        <Topbar
          title={getPageTitle()}
          subtitle={getPageSubtitle()}
          breadcrumb={getBreadcrumb()}
          branches={branches}
          selectedBranch={selectedBranch}
          onSelectBranch={setSelectedBranch}
          currentUser={{
            name: 'Administrator',
            role: 'Inventory Director',
            branch: selectedBranch === 'all' ? 'All Branches' : selectedBranch
          }}
        />

        <div className="anova-page-content">
          <InventoryModule
            activeSubpage={activePage.startsWith('inv-') ? activePage : 'inv-dashboard'}
            onSubpageChange={setActivePage}
            selectedBranch={selectedBranch}
          />
        </div>
      </main>
    </div>
  );
}
