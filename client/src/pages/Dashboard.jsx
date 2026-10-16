const summaryCards = [
  {
    label: "Today's Orders",
    value: "128",
    note: "Orders received today",
    type: "orders",
  },
  {
    label: "Active Reservations",
    value: "24",
    note: "Upcoming bookings",
    type: "reservations",
  },
  {
    label: "Today's Revenue",
    value: "₹48,650",
    note: "Sample revenue",
    type: "revenue",
  },
  {
    label: "Available Tables",
    value: "12",
    note: "Ready for seating",
    type: "tables",
  },
];

const restaurantModules = [
  {
    number: "01",
    title: "Menu Management",
    description: "Manage dishes, categories, prices and availability.",
  },
  {
    number: "02",
    title: "Table Management",
    description: "Monitor table capacity and seating availability.",
  },
  {
    number: "03",
    title: "Reservations",
    description: "Manage bookings, confirmations and cancellations.",
  },
  {
    number: "04",
    title: "Order Management",
    description: "Track dine-in, takeaway and online orders.",
  },
  {
    number: "05",
    title: "Kitchen Workflow",
    description: "Monitor preparation progress and ready orders.",
  },
  {
    number: "06",
    title: "Billing & Payments",
    description: "Generate bills, apply discounts and record payments.",
  },
  {
    number: "07",
    title: "Food Recommendations",
    description: "Explore personalized and popular dish suggestions.",
  },
];

function Dashboard() {
  return (
    <div className="dashboard-page">
      <section className="dashboard-welcome">
        <div>
          <p className="dashboard-eyebrow">RESTAURANT OPERATIONS</p>

          <h1>Welcome, Administrator</h1>

          <p className="dashboard-welcome-description">
            Here's an overview of your restaurant's operations.
          </p>
        </div>

        <div className="dashboard-date">
          <span>WORKSPACE</span>
          <strong>Anova Enterprise</strong>
        </div>
      </section>

      <section className="dashboard-summary">
        {summaryCards.map((card) => (
          <article
            className="dashboard-summary-card"
            key={card.label}
          >
            <div className="dashboard-summary-heading">
              <span>{card.label}</span>
              <span
                className={`dashboard-summary-indicator ${card.type}`}
                aria-hidden="true"
              />
            </div>

            <h2>{card.value}</h2>

            <p>{card.note}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-modules-section">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-eyebrow">YOUR WORKSPACE</p>
            <h2>Restaurant Operations</h2>
          </div>

          <span className="dashboard-module-count">
            07 MODULES
          </span>
        </div>

        <div className="dashboard-module-grid">
          {restaurantModules.map((module) => (
            <article
              className="dashboard-module-card"
              key={module.number}
            >
              <div className="dashboard-module-card-top">
                <span className="dashboard-module-number">
                  {module.number}
                </span>

                <span
                  className="dashboard-module-arrow"
                  aria-hidden="true"
                >
                  ↗
                </span>
              </div>

              <h3>{module.title}</h3>

              <p>{module.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-activity">
  <div className="dashboard-section-heading">
    <div>
      <p className="dashboard-eyebrow">ACTIVITY OVERVIEW</p>
      <h2>Recent Activity</h2>
    </div>

    <span className="dashboard-module-count">DEMO DATA</span>
  </div>

  <div className="dashboard-activity-list">
    <article className="dashboard-activity-item">
      <span className="dashboard-activity-icon order" aria-hidden="true">
        O
      </span>

      <div className="dashboard-activity-details">
        <h3>New Order Received</h3>
        <p>Order #ORD-1042 was received and is awaiting preparation.</p>
      </div>

      <time>10:42 AM</time>
    </article>

    <article className="dashboard-activity-item">
      <span
        className="dashboard-activity-icon reservation"
        aria-hidden="true"
      >
        R
      </span>

      <div className="dashboard-activity-details">
        <h3>Reservation Confirmed</h3>
        <p>A table reservation for 4 guests was confirmed.</p>
      </div>

      <time>10:25 AM</time>
    </article>

    <article className="dashboard-activity-item">
      <span className="dashboard-activity-icon payment" aria-hidden="true">
        ₹
      </span>

      <div className="dashboard-activity-details">
        <h3>Payment Recorded</h3>
        <p>A payment of ₹1,250 was recorded successfully.</p>
      </div>

      <time>10:08 AM</time>
    </article>

    <article className="dashboard-activity-item">
      <span className="dashboard-activity-icon kitchen" aria-hidden="true">
        K
      </span>

      <div className="dashboard-activity-details">
        <h3>Order Ready for Serving</h3>
        <p>Order #ORD-1038 has completed kitchen preparation.</p>
      </div>

      <time>9:54 AM</time>
    </article>

    <article className="dashboard-activity-item">
      <span className="dashboard-activity-icon menu" aria-hidden="true">
        M
      </span>

      <div className="dashboard-activity-details">
        <h3>Menu Availability Updated</h3>
        <p>Paneer Tikka availability was updated in the menu.</p>
      </div>

      <time>9:30 AM</time>
    </article>
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