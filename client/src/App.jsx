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
      case 'dashboard':
        return 'Executive Overview';
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
        return 'Reservation Management';
      case 'ops-orders':
        return 'Orders & POS Workflow';
      case 'ops-kitchen':
        return 'Kitchen Display System';
      case 'ops-billing':
        return 'Billing & Payment Processing';
      case 'core-branches':
        return 'Branches & Operational Locations';
      case 'core-staff':
        return 'Staff & Role Permissions';
      case 'cust-management':
        return 'Customer & Guest Directory';
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
    return 'The Art of Intelligent Hospitality — Multi-Branch Enterprise System';
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
            name: 'Arjun Verma',
            role: 'Enterprise Director',
            branch: selectedBranch === 'all' ? 'All Branches' : selectedBranch
          }}
        />

        <div className="anova-page-content">
          {/* Inventory Module Routes */}
          {activePage.startsWith('inv-') ? (
            <InventoryModule
              activeSubpage={activePage}
              onSubpageChange={setActivePage}
              selectedBranch={selectedBranch}
            />
          ) : (
            /* Other Enterprise Modules Workspace */
            <div className="inv-card" style={{ padding: '48px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: '44px', marginBottom: '16px' }}>🍽️</div>
              <h2 style={{ color: 'var(--anova-forest-green)', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>
                {getPageTitle()}
              </h2>
              <p style={{ color: 'var(--color-text-muted)', maxWidth: '540px', margin: '0 auto 24px', fontSize: '13.5px' }}>
                This operational workspace is maintained by the Restaurant Operations team (Member 3).
                Switch to any of the <strong>Inventory & Supply Chain</strong> modules on the sidebar to inspect our live inventory implementation.
              </p>
              <button
                type="button"
                className="inv-btn inv-btn-primary"
                onClick={() => setActivePage('inv-dashboard')}
              >
                Go to Inventory Dashboard →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
