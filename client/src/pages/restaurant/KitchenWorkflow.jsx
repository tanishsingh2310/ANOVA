import { useMemo, useState } from "react";
import "../../styles/kitchen-workflow.css";

const initialKitchenOrders = [
  {
    id: "ORD-1001",
    customer: "Aarav Shah",
    orderType: "Dine-in",
    table: "T-04",
    items: [
      { name: "Paneer Tikka", quantity: 2 },
      { name: "Fresh Lime Soda", quantity: 2 },
    ],
    status: "Pending",
    createdAt: "2026-10-15T12:05:00",
    notes: "Less spicy",
  },
  {
    id: "ORD-1002",
    customer: "Diya Patel",
    orderType: "Takeaway",
    table: "—",
    items: [
      { name: "Classic Margherita", quantity: 1 },
      { name: "Chocolate Brownie", quantity: 1 },
    ],
    status: "Preparing",
    createdAt: "2026-10-15T12:10:00",
    notes: "Pack separately",
  },
  {
    id: "ORD-1003",
    customer: "Rohan Mehta",
    orderType: "Dine-in",
    table: "T-06",
    items: [
      { name: "Veg Biryani", quantity: 2 },
      { name: "Dal Makhani", quantity: 1 },
    ],
    status: "Pending",
    createdAt: "2026-10-15T12:14:00",
    notes: "",
  },
  {
    id: "ORD-1004",
    customer: "Ananya Desai",
    orderType: "Delivery",
    table: "—",
    items: [
      { name: "Paneer Tikka", quantity: 1 },
      { name: "Veg Biryani", quantity: 1 },
    ],
    status: "Ready",
    createdAt: "2026-10-15T12:00:00",
    notes: "Deliver to reception",
  },
  {
    id: "ORD-1005",
    customer: "Vivaan Joshi",
    orderType: "Dine-in",
    table: "T-02",
    items: [
      { name: "Dal Makhani", quantity: 1 },
      { name: "Fresh Lime Soda", quantity: 2 },
    ],
    status: "Preparing",
    createdAt: "2026-10-15T12:08:00",
    notes: "",
  },
  {
    id: "ORD-1006",
    customer: "Myra Trivedi",
    orderType: "Takeaway",
    table: "—",
    items: [
      { name: "Classic Margherita", quantity: 2 },
    ],
    status: "Completed",
    createdAt: "2026-10-15T11:45:00",
    notes: "",
  },
];

const workflowStages = [
  {
    name: "Pending",
    description: "Waiting to be prepared",
    className: "pending",
    nextStatus: "Preparing",
    actionLabel: "Start Preparing",
  },
  {
    name: "Preparing",
    description: "Currently in the kitchen",
    className: "preparing",
    nextStatus: "Ready",
    actionLabel: "Mark as Ready",
  },
  {
    name: "Ready",
    description: "Ready for collection or service",
    className: "ready",
    nextStatus: "Completed",
    actionLabel: "Complete Order",
  },
];

function getElapsedMinutes(createdAt) {
  const elapsed = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 60000
  );

  return Math.max(0, elapsed);
}

function formatElapsedTime(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hr`;
}

function KitchenWorkflow() {
  const [orders, setOrders] = useState(initialKitchenOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("All");
  const [showCompleted, setShowCompleted] = useState(false);

  const summary = useMemo(
    () => ({
      pending: orders.filter(
        (order) => order.status === "Pending"
      ).length,
      preparing: orders.filter(
        (order) => order.status === "Preparing"
      ).length,
      ready: orders.filter(
        (order) => order.status === "Ready"
      ).length,
      completed: orders.filter(
        (order) => order.status === "Completed"
      ).length,
    }),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        order.id.toLowerCase().includes(query) ||
        order.customer.toLowerCase().includes(query) ||
        order.items.some((item) =>
          item.name.toLowerCase().includes(query)
        );

      const matchesType =
        orderTypeFilter === "All" ||
        order.orderType === orderTypeFilter;

      const matchesCompletion =
        showCompleted || order.status !== "Completed";

      return matchesSearch && matchesType && matchesCompletion;
    });
  }, [orders, searchTerm, orderTypeFilter, showCompleted]);

  function advanceOrder(orderId, nextStatus) {
    setOrders((previous) =>
      previous.map((order) =>
        order.id === orderId
          ? { ...order, status: nextStatus }
          : order
      )
    );
  }

  function clearFilters() {
    setSearchTerm("");
    setOrderTypeFilter("All");
  }

  return (
    <section className="kitchen-page">
      <div className="kitchen-page-header">
        <div className="kitchen-heading">
          <span className="kitchen-eyebrow">
            RESTAURANT OPERATIONS
          </span>
          <h2>Kitchen Workflow</h2>
          <p>
            Coordinate preparation, monitor order progress, and keep
            kitchen service running smoothly.
          </p>
        </div>

        <div className="kitchen-live-indicator">
          <span className="kitchen-live-dot" />
          Kitchen Overview
        </div>
      </div>

      <div className="kitchen-summary-grid">
        <SummaryCard
          label="Pending Orders"
          value={summary.pending}
          className="pending"
          icon="◷"
        />
        <SummaryCard
          label="Preparing"
          value={summary.preparing}
          className="preparing"
          icon="♨"
        />
        <SummaryCard
          label="Ready to Serve"
          value={summary.ready}
          className="ready"
          icon="✓"
        />
        <SummaryCard
          label="Completed"
          value={summary.completed}
          className="completed"
          icon="▤"
        />
      </div>

      <div className="kitchen-toolbar">
        <div className="kitchen-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search order, customer or food item..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            aria-label="Search kitchen orders"
          />
        </div>

        <select
          className="kitchen-filter"
          value={orderTypeFilter}
          onChange={(event) => setOrderTypeFilter(event.target.value)}
          aria-label="Filter by order type"
        >
          <option value="All">All order types</option>
          <option value="Dine-in">Dine-in</option>
          <option value="Takeaway">Takeaway</option>
          <option value="Delivery">Delivery</option>
        </select>

        <label className="kitchen-completed-toggle">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(event) => setShowCompleted(event.target.checked)}
          />
          Show completed
        </label>

        {(searchTerm || orderTypeFilter !== "All") && (
          <button
            className="kitchen-clear-button"
            type="button"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="kitchen-workflow-heading">
        <div>
          <h3>Order Preparation Board</h3>
          <p>
            Move each order forward as the kitchen completes its work.
          </p>
        </div>
        <span className="kitchen-order-count">
          {filteredOrders.length}{" "}
          {filteredOrders.length === 1 ? "order" : "orders"}
        </span>
      </div>

      <div className="kitchen-workflow-board">
        {workflowStages.map((stage) => {
          const stageOrders = filteredOrders
            .filter((order) => order.status === stage.name)
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            );

          return (
            <section
              className={`kitchen-stage ${stage.className}`}
              key={stage.name}
            >
              <div className="kitchen-stage-header">
                <div className="kitchen-stage-title">
                  <span className="kitchen-stage-indicator" />
                  <h4>{stage.name}</h4>
                  <span className="kitchen-stage-count">
                    {stageOrders.length}
                  </span>
                </div>
                <p>{stage.description}</p>
              </div>

              <div className="kitchen-stage-orders">
                {stageOrders.map((order) => {
                  const elapsed = getElapsedMinutes(order.createdAt);
                  const isPriority = elapsed >= 20;

                  return (
                    <article
                      className="kitchen-order-card"
                      key={order.id}
                    >
                      <div className="kitchen-order-card-header">
                        <strong>{order.id}</strong>
                        <span
                          className={`kitchen-order-timer ${
                            isPriority ? "priority" : ""
                          }`}
                        >
                          ◷ {formatElapsedTime(elapsed)}
                        </span>
                      </div>

                      <div className="kitchen-order-customer">
                        <h5>{order.customer}</h5>
                        <span>
                          {order.orderType}
                          {order.orderType === "Dine-in"
                            ? ` · ${order.table}`
                            : ""}
                        </span>
                      </div>

                      {isPriority && (
                        <div className="kitchen-priority-label">
                          <span aria-hidden="true">!</span>
                          Waiting longer than 20 minutes
                        </div>
                      )}

                      <div className="kitchen-order-items">
                        <span className="kitchen-section-label">
                          ORDER ITEMS
                        </span>

                        {order.items.map((item, index) => (
                          <div
                            className="kitchen-order-item"
                            key={`${order.id}-${item.name}-${index}`}
                          >
                            <span>{item.name}</span>
                            <strong>× {item.quantity}</strong>
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <div className="kitchen-order-notes">
                          <span>Note</span>
                          {order.notes}
                        </div>
                      )}

                      <div className="kitchen-order-card-footer">
                        <span>
                          {order.items.reduce(
                            (total, item) => total + item.quantity,
                            0
                          )}{" "}
                          total items
                        </span>

                        <button
                          type="button"
                          className="kitchen-advance-button"
                          onClick={() =>
                            advanceOrder(order.id, stage.nextStatus)
                          }
                        >
                          {stage.actionLabel}
                          <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    </article>
                  );
                })}

                {stageOrders.length === 0 && (
                  <div className="kitchen-stage-empty">
                    <span aria-hidden="true">✓</span>
                    <p>No orders in this stage</p>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {showCompleted && (
        <section className="kitchen-completed-section">
          <div className="kitchen-workflow-heading">
            <div>
              <h3>Completed Orders</h3>
              <p>Orders that have finished the kitchen workflow.</p>
            </div>
            <span className="kitchen-order-count">
              {
                filteredOrders.filter(
                  (order) => order.status === "Completed"
                ).length
              }{" "}
              completed
            </span>
          </div>

          <div className="kitchen-completed-list">
            {filteredOrders
              .filter((order) => order.status === "Completed")
              .map((order) => (
                <article
                  className="kitchen-completed-card"
                  key={order.id}
                >
                  <span className="kitchen-completed-check">✓</span>
                  <div>
                    <strong>{order.id}</strong>
                    <span>{order.customer}</span>
                  </div>
                  <span className="kitchen-completed-type">
                    {order.orderType}
                  </span>
                </article>
              ))}

            {filteredOrders.every(
              (order) => order.status !== "Completed"
            ) && (
              <div className="kitchen-completed-empty">
                No completed orders match your current filters.
              </div>
            )}
          </div>
        </section>
      )}
    </section>
  );
}

function SummaryCard({ label, value, className, icon }) {
  return (
    <div className="kitchen-summary-card">
      <div className={`kitchen-summary-icon ${className}`}>
        {icon}
      </div>
      <div className="kitchen-summary-info">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export default KitchenWorkflow;