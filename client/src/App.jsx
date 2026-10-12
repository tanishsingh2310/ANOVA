import { useState } from "react";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Kitchen from "./pages/Kitchen";
import Inventory from "./pages/Inventory";
import "./App.css";
import Settings from "./pages/Settings";
import "./restaurant-alert.js";

function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  return (
    <div className="app">

      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <main className="main-content">

        <Topbar activePage={activePage} />

        {activePage === "Dashboard" && <Dashboard />}

{activePage === "Orders" && <Orders />}
{activePage === "Kitchen" && <Kitchen />}
{activePage === "Inventory"&& <Inventory />}
{activePage === "Settings"&& <Settings />}
      </main>

    </div>
  );
}

export default App;