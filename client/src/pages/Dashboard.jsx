import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  LayoutGrid,
  MapPin,
  ReceiptText,
  Utensils,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

const summaryCards = [
  {
    label: "Today's Orders",
    value: "128",
    note: "Orders received today",
    trend: "+12%",
    trendDirection: "up",
    type: "orders",
    icon: ReceiptText,
  },
  {
    label: "Active Reservations",
    value: "24",
    note: "Upcoming bookings",
    trend: "+8%",
    trendDirection: "up",
    type: "reservations",
    icon: CalendarDays,
  },
  {
    label: "Today's Revenue",
    value: "₹48,650",
    note: "Sample revenue",
    trend: "+15%",
    trendDirection: "up",
    type: "revenue",
    icon: Wallet,
  },
  {
    label: "Available Tables",
    value: "12",
    note: "Ready for seating",
    trend: "0%",
    trendDirection: "neutral",
    type: "tables",
    icon: Utensils,
  },
];

const restaurantModules = [
  {
    number: "01",
    title: "Menu Management",
    description: "Manage dishes, categories, prices and availability.",
    type: "menu",
    icon: UtensilsCrossed,
  },
  {
    number: "02",
    title: "Table Management",
    description: "Monitor table capacity and seating availability.",
    type: "tables",
    icon: LayoutGrid,
  },
  {
    number: "03",
    title: "Reservations",
    description: "Manage bookings, confirmations and cancellations.",
    type: "reservations",
    icon: CalendarDays,
  },
  {
    number: "04",
    title: "Orders",
    description: "Track and manage customer orders.",
    type: "orders",
    icon: ClipboardList,
  },
  {
    number: "05",
    title: "Kitchen Workflow",
    description: "Coordinate kitchen operations and order preparation.",
    type: "kitchen",
    icon: ChefHat,
  },
  {
    number: "06",
    title: "Billing & Payments",
    description: "Handle payments, invoices and transactions.",
    type: "billing",
    icon: CircleDollarSign,
  },
];

const recentActivities = [
  {
    title: "New Order Received",
    description:
      "Order #ORD-1042 was received and is awaiting preparation.",
    time: "10:42 AM",
    type: "order",
    icon: ReceiptText,
  },
  {
    title: "Reservation Confirmed",
    description: "A table reservation for 4 guests was confirmed.",
    time: "10:25 AM",
    type: "reservation",
    icon: CalendarDays,
  },
  {
    title: "Payment Recorded",
    description: "A payment of ₹1,250 was recorded successfully.",
    time: "10:08 AM",
    type: "payment",
    icon: Wallet,
  },
  {
    title: "Order Ready for Serving",
    description: "Order #ORD-1038 has completed kitchen preparation.",
    time: "9:54 AM",
    type: "kitchen",
    icon: CheckCircle2,
  },
  {
    title: "Menu Availability Updated",
    description: "Paneer Tikka availability was updated in the menu.",
    time: "9:30 AM",
    type: "menu",
    icon: UtensilsCrossed,
  },
];

function Dashboard() {
  return (
    <div className="dashboard-page">
      <section className="dashboard-welcome">
        <div className="dashboard-welcome-content">
          <p className="dashboard-eyebrow dashboard-welcome-eyebrow">
            <span className="dashboard-eyebrow-line" />
            ANOVA
          </p>

          <h1>Welcome, Administrator</h1>

          <p className="dashboard-welcome-description">
            Here's an overview of your restaurant's operations.
          </p>
        </div>

        <button
          className="dashboard-workspace-badge"
          type="button"
          aria-label="Current workspace: Main Branch"
        >
          <span className="dashboard-workspace-icon">
            <MapPin size={17} />
          </span>

          <span className="dashboard-workspace-details">
            <span className="dashboard-workspace-label">WORKSPACE</span>
            <strong>Main Branch</strong>
          </span>

          <ChevronRight size={17} className="dashboard-workspace-chevron" />
        </button>
      </section>

      <section
        className="dashboard-summary"
        aria-label="Restaurant summary"
      >
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const TrendIcon =
            card.trendDirection === "up" ? ArrowUpRight : ArrowDownRight;

          return (
            <article
              className={`dashboard-summary-card dashboard-summary-card-${card.type}`}
              key={card.label}
            >
              <div className="dashboard-summary-heading">
                <span className="dashboard-summary-label">{card.label}</span>

                <span className="dashboard-summary-icon">
                  <Icon size={21} strokeWidth={1.8} />
                </span>
              </div>

              <div className="dashboard-summary-value-row">
                <h2>{card.value}</h2>
              </div>

              <div className="dashboard-summary-footer">
                <p>{card.note}</p>

                <span
                  className={`dashboard-summary-trend dashboard-summary-trend-${card.trendDirection}`}
                >
                  {card.trendDirection === "up" ? (
                    <TrendIcon size={14} strokeWidth={2} />
                  ) : null}
                  {card.trend}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="dashboard-modules-section">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-eyebrow dashboard-section-eyebrow">
              <span className="dashboard-eyebrow-line" />
              YOUR WORKSPACE
            </p>

            <h2>Restaurant Operations</h2>
          </div>

          <span className="dashboard-module-count">
            <LayoutGrid size={15} strokeWidth={1.8} />
            <span>07 MODULES</span>
          </span>
        </div>

        <div className="dashboard-module-grid">
          {restaurantModules.map((module) => {
            const Icon = module.icon;

            return (
              <article
                className={`dashboard-module-card dashboard-module-card-${module.type}`}
                key={module.number}
              >
                <div className="dashboard-module-card-top">
                  <span className="dashboard-module-icon">
                    <Icon size={22} strokeWidth={1.7} />
                  </span>

                  <span className="dashboard-module-arrow" aria-hidden="true">
                    <ArrowRight size={17} strokeWidth={1.8} />
                  </span>
                </div>

                <h3>{module.title}</h3>

                <p>{module.description}</p>

                <span className="dashboard-module-decoration" aria-hidden="true" />
              </article>
            );
          })}
        </div>
      </section>

      <section className="dashboard-activity">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-eyebrow dashboard-section-eyebrow">
              <span className="dashboard-eyebrow-line" />
              ACTIVITY OVERVIEW
            </p>

            <h2>Recent Activity</h2>
          </div>

          <span className="dashboard-module-count dashboard-demo-label">
            <Activity size={15} strokeWidth={1.8} />
            <span>DEMO DATA</span>
          </span>
        </div>

        <div className="dashboard-activity-list">
          {recentActivities.map((activity) => {
            const Icon = activity.icon;

            return (
              <article
                className="dashboard-activity-item"
                key={activity.title}
              >
                <span
                  className={`dashboard-activity-icon dashboard-activity-icon-${activity.type}`}
                  aria-hidden="true"
                >
                  <Icon size={19} strokeWidth={1.8} />
                </span>

                <div className="dashboard-activity-details">
                  <h3>{activity.title}</h3>
                  <p>{activity.description}</p>
                </div>

                <time className="dashboard-activity-time">
                  <Clock3 size={13} strokeWidth={1.8} />
                  {activity.time}
                </time>
              </article>
            );
          })}
        </div>

        <p className="dashboard-activity-disclaimer">
          These activities are illustrative examples and do not represent live
          restaurant transactions.
        </p>
      </section>

      <footer className="dashboard-footer">
        <span>Anova Enterprise Management System</span>
        <span>Restaurant Operations Workspace</span>
      </footer>
    </div>
  );
}

export default Dashboard;