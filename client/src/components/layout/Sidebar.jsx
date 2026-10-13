const navigation = [
  {
    title: "Overview",
    items: ["Dashboard"],
  },
  {
    title: "Restaurant Operations",
    items: [
      "Menu Management",
      "Table Management",
      "Reservations",
      "Orders",
      "Kitchen Workflow",
      "Billing & Payments",
      "Food Recommendations",
    ],
  },
  {
    title: "Other Modules",
    items: [
      "Administration",
      "Inventory",
      "Customer Management",
      "Reports & Analytics",
    ],
  },
];

function Sidebar({ activePage, setActivePage }) {
  return (
    <aside className="anova-sidebar">
      <div className="anova-sidebar-brand">
        <span className="anova-brand-mark">A</span>

        <div>
          <h1>Anova</h1>
          <p>Restaurant Enterprise Suite</p>
        </div>
      </div>

      <nav className="anova-sidebar-nav">
        {navigation.map((section) => (
          <div className="anova-nav-section" key={section.title}>
            <p className="anova-nav-heading">{section.title}</p>

            {section.items.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setActivePage(item)}
                className={`anova-nav-item ${
                  activePage === item ? "active" : ""
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="anova-sidebar-footer">
        <p>ANOVA MANAGEMENT SYSTEM</p>
        <span>Enterprise Edition</span>
      </div>
    </aside>
  );
}

export default Sidebar;