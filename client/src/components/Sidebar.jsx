function Sidebar({ activePage, setActivePage }) {

  const menuItems = [
    { name: "Dashboard", icon: "⌂" },
    { name: "Orders", icon: "▣" },
    { name: "Kitchen", icon: "◈" },
    { name: "Inventory", icon: "▤" }
  ];

  return (
    <aside className="sidebar">

      <div className="brand">

        <div className="brand-mark">
          R
        </div>

        <div>
          <h2>RestoHub</h2>
          <span>Enterprise Management</span>
        </div>

      </div>


      <nav className="sidebar-nav">

        <p className="nav-label">
          MAIN MENU
        </p>


        {menuItems.map((item) => (

          <button
            key={item.name}
            className={`nav-item ${
              activePage === item.name ? "active" : ""
            }`}
            onClick={() => setActivePage(item.name)}
          >

            <span>
              {item.icon}
            </span>

            {item.name}

          </button>

        ))}


        <p className="nav-label secondary-label">
          SYSTEM
        </p>


        <button
          className={`nav-item ${
            activePage === "Settings" ? "active" : ""
          }`}
          onClick={() => setActivePage("Settings")}
        >

          <span>⚙</span>

          Settings

        </button>

      </nav>


      <div className="sidebar-footer">

        <div className="user-avatar">
          A
        </div>

        <div className="user-info">

          <strong>
            Admin
          </strong>

          <span>
            System Administrator
          </span>

        </div>

      </div>

    </aside>
  );
}

export default Sidebar;