import { useState } from "react";

import Sidebar from "../components/layouts/Sidebar";
import Topbar from "../components/layouts/Topbar";
import Dashboard from "../features/dashboard/Dashboard";
import MenuManagement from "../features/restaurant/menu/MenuManagement";
import TableManagement from "../features/restaurant/tables/TableManagement";
import Reservations from "../features/restaurant/reservations/Reservations";
import Orders from "../features/restaurant/orders/Orders";
import KitchenWorkflow from "../features/restaurant/kitchen/KitchenWorkflow";
import BillingPayments from "../features/restaurant/billing/BillingPayments";
import FoodRecommendations from "../features/restaurant/recommendations/FoodRecommendations";

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