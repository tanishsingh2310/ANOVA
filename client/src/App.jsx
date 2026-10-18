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
    localStorage.setItem('anova_user_branch', selectedBranch);
    localStorage.setItem('anova_user_role', 'admin');

    const branchList = InventoryService.getBranches();
    setBranches(branchList);

    // Initial local compute for immediate responsiveness
    const kpis = AnalyticsService.getDashboardKPIs(selectedBranch);
    setAlertsCount(kpis.totalAlerts);

    // Async backend fetch
    AnalyticsService.fetchDashboardKPIsRemote(selectedBranch).then(remoteKpis => {
      if (remoteKpis) setAlertsCount(remoteKpis.totalAlerts);
    }).catch(() => {});
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
          {activePage.startsWith('inv-') ? (
            <InventoryModule
              activeSubpage={activePage}
              onSubpageChange={setActivePage}
              selectedBranch={selectedBranch}
            />
          ) : (
            <div
              className="anova-card anova-integration-notice"
              style={{
                padding: '48px 32px',
                textAlign: 'center',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                margin: '20px 0',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '16px' }}>🤝</div>
              <h3 style={{ margin: '0 0 10px', color: 'var(--color-primary)', fontSize: '20px' }}>
                Cross-Module Team Integration Handshake
              </h3>
              <p
                style={{
                  maxWidth: '640px',
                  margin: '0 auto 24px',
                  color: 'var(--color-text-muted)',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}
              >
                This module domain is assigned to{' '}
                <strong>
                  {activePage.startsWith('ext-menu') ||
                  activePage.startsWith('ext-kitchen') ||
                  activePage.startsWith('ext-tables') ||
                  activePage.startsWith('ext-billing')
                    ? 'Member 3 (Restaurant Operations & Transactions)'
                    : activePage.startsWith('ext-users') ||
                      activePage.startsWith('ext-branches') ||
                      activePage.startsWith('ext-hr') ||
                      activePage.startsWith('ext-audit')
                    ? 'Member 1 (Core System & Administration)'
                    : 'Member 4 (Customer Experience & BI)'}
                </strong>{' '}
                under the ANOVA Team Architecture Contract.
                <br />
                In this workspace (Member 2), all{' '}
                <strong>5 Inventory & Supply Chain modules</strong> are fully developed and operational.
              </p>
              <button
                type="button"
                className="anova-btn-primary"
                onClick={() => setActivePage('inv-dashboard')}
                style={{
                  padding: '10px 20px',
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Return to Live Inventory Modules →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
