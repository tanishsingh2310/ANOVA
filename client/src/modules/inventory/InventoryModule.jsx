import { useState, useEffect } from 'react';
import InventoryDashboard from './pages/InventoryDashboard';
import IngredientsPage from './pages/IngredientsPage';
import SuppliersPage from './pages/SuppliersPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import TransfersPage from './pages/TransfersPage';
import WastagePage from './pages/WastagePage';
import ReportsPage from './pages/ReportsPage';
import { InventoryService } from './services/inventoryService';
import './styles/inventory.css';

export default function InventoryModule({
  activeSubpage = 'inv-dashboard',
  onSubpageChange = () => {},
  selectedBranch = 'all'
}) {
  const [currentTab, setCurrentTab] = useState(activeSubpage);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    setCurrentTab(activeSubpage);
  }, [activeSubpage]);

  useEffect(() => {
    setBranches(InventoryService.getBranches());
  }, [selectedBranch]);

  const handleTabChange = (tabId) => {
    setCurrentTab(tabId);
    onSubpageChange(tabId);
  };

  return (
    <div className="anova-inventory-module">
      {/* Render Active Subsection */}
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
