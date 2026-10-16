import { useState, useEffect } from 'react';
import './styles/theme.css';
import './styles/layout.css';
import './styles/dashboard.css';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import InventoryModule from './modules/inventory/InventoryModule';
import { AnalyticsService } from './modules/inventory/services/analyticsService';
import { InventoryService } from './modules/inventory/services/inventoryService';

// Tanvi Restaurant Operations Pages
import Dashboard from './pages/Dashboard';
import MenuManagement from './pages/restaurant/MenuManagement';
import TableManagement from './pages/restaurant/TableManagement';
import Reservations from './pages/restaurant/Reservations';
import Orders from './pages/restaurant/Orders';
import KitchenWorkflow from './pages/restaurant/KitchenWorkflow';
import BillingPayments from './pages/restaurant/BillingPayments';
import FoodRecommendations from './pages/restaurant/FoodRecommendations';

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
      case 'dashboard':
        return 'Executive Dashboard';
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
      case 'ops-menu':
        return 'Menu Management';
      case 'ops-tables':
        return 'Table Management';
      case 'ops-reservations':
        return 'Reservations';
      case 'ops-orders':
        return 'Orders & POS Workflow';
      case 'ops-kitchen':
        return 'Kitchen Workflow';
      case 'ops-billing':
        return 'Billing & Payments';
      case 'ops-recommendations':
        return 'Food Recommendations';
      case 'core-admin':
        return 'Administration';
      case 'core-branches':
        return 'Branches & Operational Locations';
      case 'core-staff':
        return 'Staff & Role Permissions';
      case 'cust-management':
        return 'Customer Management';
      default:
        return 'ANOVA Restaurant Management';
    }
  };

  const getBreadcrumb = () => {
    if (activePage === 'dashboard') return 'ANOVA / OVERVIEW';
    if (activePage.startsWith('inv-')) return 'ANOVA / INVENTORY & SUPPLY CHAIN';
    if (activePage.startsWith('ops-')) return 'ANOVA / RESTAURANT OPERATIONS';
    if (activePage.startsWith('core-') || activePage.startsWith('cust-')) return 'ANOVA / ENTERPRISE MANAGEMENT';
    return 'ANOVA';
  };

  const getPageSubtitle = () => {
    if (activePage.startsWith('inv-')) {
      return 'Enterprise inventory control, procurement lifecycle, and branch logistics';
    }
    return 'The Art of Intelligent Hospitality';
  };

  const renderContent = () => {
    if (activePage.startsWith('inv-')) {
      return (
        <InventoryModule
          activeSubpage={activePage}
          onSubpageChange={setActivePage}
          selectedBranch={selectedBranch}
        />
      );
    }

    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'ops-menu':
        return <MenuManagement />;
      case 'ops-tables':
        return <TableManagement />;
      case 'ops-reservations':
        return <Reservations />;
      case 'ops-orders':
        return <Orders />;
      case 'ops-kitchen':
        return <KitchenWorkflow />;
      case 'ops-billing':
        return <BillingPayments />;
      case 'ops-recommendations':
        return <FoodRecommendations />;
      default:
        return (
          <div className="inv-card" style={{ padding: '48px 32px', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-primary)', marginBottom: '10px', fontSize: '22px', fontWeight: 600 }}>
              {getPageTitle()}
            </h2>
            <p style={{ color: 'var(--color-text-muted)', maxWidth: '520px', margin: '0 auto 24px', fontSize: '13px', lineHeight: '1.6' }}>
              This operational module is managed in the ANOVA Enterprise suite. You can navigate through live <strong>Inventory & Supply Chain</strong> and <strong>Restaurant Operations</strong> modules using the sidebar.
            </p>
            <div style={{ display: 'inline-flex', gap: '12px' }}>
              <button
                type="button"
                className="inv-btn inv-btn-primary"
                onClick={() => setActivePage('inv-dashboard')}
              >
                Go to Inventory Dashboard
              </button>
              <button
                type="button"
                className="inv-btn inv-btn-secondary"
                onClick={() => setActivePage('dashboard')}
              >
                Executive Dashboard
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="anova-app-shell">
      {/* Shared Sidebar */}
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
            role: 'System Access',
            branch: selectedBranch === 'all' ? 'All Branches' : selectedBranch
          }}
        />

        <div className="anova-page-content">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
