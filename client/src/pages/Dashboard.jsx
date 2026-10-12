import InventorySummary from "../components/InventorySummary";
import StatCard from "../components/StatCard";
import OrderTable from "../components/OrderTable";

function Dashboard() {
  return (
    <div className="dashboard-page">

      <div className="page-heading">
        <div>
          <h2>Overview</h2>
          <p>Monitor today's restaurant operations.</p>
        </div>

        <span className="date-label">
          24 September 2026
        </span>
      </div>

      <div className="stats-grid">

        <StatCard
          title="Total Orders"
          value="128"
          description="12% compared to yesterday"
        />

        <StatCard
          title="Today's Revenue"
          value="₹42,580"
          description="8% compared to yesterday"
        />

        <StatCard
          title="Pending Orders"
          value="12"
          description="Requires kitchen attention"
        />

        <StatCard
          title="Low Stock Items"
          value="06"
          description="Items need restocking"
        />

      </div>

      <OrderTable />
      <OrderTable />

<InventorySummary />

    </div>
  );
}

export default Dashboard;