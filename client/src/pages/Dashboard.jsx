import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  LayoutGrid,
  MapPin,
  MessageSquareQuote,
  ReceiptText,
  ShoppingBag,
  Star,
  Store,
  Tag,
  Truck,
  Wallet,
} from "lucide-react";

const summaryCards = [
  {
    label: "Today's Online Orders",
    value: "142",
    note: "Orders placed online",
    trend: "+18%",
    trendDirection: "up",
    type: "orders",
    icon: ReceiptText,
  },
  {
    label: "Active Deliveries",
    value: "19",
    note: "Riders on the way",
    trend: "+8%",
    trendDirection: "up",
    type: "reservations",
    icon: Truck,
  },
  {
    label: "Digital Revenue",
    value: "₹52,480",
    note: "Sample daily revenue",
    trend: "+15%",
    trendDirection: "up",
    type: "revenue",
    icon: Wallet,
  },
  {
    label: "Customer Rating",
    value: "4.9 ★",
    note: "Based on 86 reviews",
    trend: "+5%",
    trendDirection: "up",
    type: "tables",
    icon: Star,
  },
];

const customerModules = [
  {
    number: "01",
    title: "Menu",
    description: "Browse digital dishes, filter culinary categories, and add dishes to the cart.",
    type: "menu",
    icon: ShoppingBag,
    to: "/menu",
  },
  {
    number: "02",
    title: "Branches",
    description: "View branch locations, operating hours, ratings, and choose delivery origin.",
    type: "tables",
    icon: Store,
    to: "/branches",
  },
  {
    number: "03",
    title: "Deliveries",
    description: "Assign delivery staff, monitor live order fulfillment, and route logistics.",
    type: "orders",
    icon: Truck,
    to: "/admin/deliveries",
  },
  {
    number: "04",
    title: "Promotions",
    description: "Create and manage promo vouchers, percentage discounts, and usage limits.",
    type: "billing",
    icon: Tag,
    to: "/admin/coupons",
  },
  {
    number: "05",
    title: "Feedback",
    description: "Moderate guest ratings, review sentiment feedback, and resolve complaints.",
    type: "kitchen",
    icon: MessageSquareQuote,
    to: "/admin/feedback",
  },
  {
    number: "06",
    title: "My orders",
    description: "Track live customer orders, order progress timeline, and past invoices.",
    type: "reservations",
    icon: ClipboardList,
    to: "/orders",
  },
];

const recentActivities = [
  {
    title: "Online Order #ORD-2104 Placed",
    description: "Customer ordered 3 items totaling ₹850 via digital checkout.",
    time: "10:48 AM",
    type: "order",
    icon: ReceiptText,
  },
  {
    title: "Delivery Rider Assigned",
    description: "Rider assigned for Order #ORD-2099 to Model Town.",
    time: "10:32 AM",
    type: "reservation",
    icon: Truck,
  },
  {
    title: "5-Star Review Received",
    description: "Guest left feedback: 'Exceptional food quality and prompt delivery.'",
    time: "10:15 AM",
    type: "payment",
    icon: Star,
  },
  {
    title: "Promo Code WELCOME50 Applied",
    description: "Customer applied 20% discount on first delivery order.",
    time: "9:50 AM",
    type: "menu",
    icon: Tag,
  },
  {
    title: "Delivery Completed Successfully",
    description: "Order #ORD-2091 delivered and marked complete by courier.",
    time: "9:24 AM",
    type: "kitchen",
    icon: CheckCircle2,
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
            Here's an overview of your customer online orders, deliveries, and engagement.
          </p>
        </div>

        <Link
          to="/branches"
          className="dashboard-workspace-badge"
          aria-label="Current workspace: Main Branch"
          style={{ textDecoration: "none" }}
        >
          <span className="dashboard-workspace-icon">
            <MapPin size={17} />
          </span>

          <span className="dashboard-workspace-details">
            <span className="dashboard-workspace-label">WORKSPACE</span>
            <strong>Main Branch</strong>
          </span>

          <ChevronRight size={17} className="dashboard-workspace-chevron" />
        </Link>
      </section>

      <section
        className="dashboard-summary"
        aria-label="Customer operations summary"
      >
        {summaryCards.map((card) => {
          const Icon = card.icon;

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
                  <ArrowUpRight size={14} strokeWidth={2} />
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

            <h2>Customer Online Orders & Analytics</h2>
          </div>

          <span className="dashboard-module-count">
            <LayoutGrid size={15} strokeWidth={1.8} />
            <span>06 MODULES</span>
          </span>
        </div>

        <div className="dashboard-module-grid">
          {customerModules.map((module) => {
            const Icon = module.icon;

            return (
              <Link
                key={module.number}
                to={module.to}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <article
                  className={`dashboard-module-card dashboard-module-card-${module.type}`}
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
              </Link>
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

            <h2>Recent Online Order Activity</h2>
          </div>

          <span className="dashboard-module-count dashboard-demo-label">
            <Activity size={15} strokeWidth={1.8} />
            <span>LIVE DISPATCH</span>
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
          Real-time customer operations and dispatch activities for the active branch.
        </p>
      </section>

      <footer className="dashboard-footer">
        <span>Anova Enterprise Management System</span>
        <span>Customer Online Ordering & Analytics Workspace</span>
      </footer>
    </div>
  );
}

export default Dashboard;