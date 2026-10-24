export default function InventoryNav({ activeTab, onTabChange, alertsCount = 0 }) {
  const tabs = [
    { id: 'inv-dashboard', label: 'Dashboard' },
    { id: 'inv-ingredients', label: 'Ingredients & Stock', badge: alertsCount > 0 ? alertsCount : null },
    { id: 'inv-suppliers', label: 'Suppliers' },
    { id: 'inv-orders', label: 'Purchase Orders & Receiving' },
    { id: 'inv-transfers', label: 'Branch Transfers' },
    { id: 'inv-wastage', label: 'Wastage & Spoilage' },
    { id: 'inv-reports', label: 'Valuation & Reports' }
  ];

  return (
    <nav className="inv-nav-tabs" aria-label="Inventory Section Navigation">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`inv-nav-tab ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            aria-selected={isActive}
            role="tab"
          >
            <span>{tab.label}</span>
            {tab.badge && <span className="tab-badge">{tab.badge}</span>}
          </button>
        );
      })}
    </nav>
  );
}
