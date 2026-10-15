import { useState } from "react";

import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import Dashboard from "./pages/Dashboard";
import MenuManagement from "./pages/restaurant/MenuManagement";
import TableManagement from "./pages/restaurant/TableManagement";
import Reservations from "./pages/restaurant/Reservations";
import Orders from "./pages/restaurant/Orders";
import KitchenWorkflow from "./pages/restaurant/KitchenWorkflow";
import BillingPayments from "./pages/restaurant/BillingPayments";
import FoodRecommendations from "./pages/restaurant/FoodRecommendations";

function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  function renderPage() {
  switch (activePage) {
    case "Menu Management":
      return <MenuManagement />;

    case "Table Management":
      return <TableManagement />;

    case "Reservations":
      return <Reservations />;
    
    case "Orders":
      return <Orders />;

    case "Kitchen Workflow":
      return <KitchenWorkflow />;

    case "Billing & Payments":
      return <BillingPayments />;
      
    case "Food Recommendations":
      return <FoodRecommendations />;

    default:
      return <Dashboard />;
  }
}

  return (
    <div className="anova-app-shell">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <main className="anova-main">
        <Topbar title={activePage} />

        <div className="anova-page-content">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;