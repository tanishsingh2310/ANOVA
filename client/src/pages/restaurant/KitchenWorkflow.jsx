import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../api";
import "../../styles/kitchen-workflow.css";

const BRANCH_ID = "6ad0e90a53cc462cbaaec9fa";

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

function mapOrder(order) {
  return {
    id: order._id,
    orderNumber: order.orderNumber,
    customer: order.customer || "Guest",
    orderType: order.orderType || "Dine-in",
    table: order.table || "",
    items: (order.items || []).map((item) => ({
      name: item.name || "Menu item",
      quantity: Number(item.quantity) || 0,
    })),
    status: order.status || "Pending",
    createdAt: order.createdAt,
    notes: order.notes || "",
  };
}

function getElapsedMinutes(createdAt) {
  const timestamp = new Date(createdAt).getTime();

  if (!Number.isFinite(timestamp)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
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
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("All");
  const [showCompleted, setShowCompleted] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadOrders = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const data = await apiRequest(`/api/orders/${BRANCH_ID}`);

      if (!Array.isArray(data)) {
        throw new Error("The server returned an unexpected orders response.");
      }

      setOrders(data.map(mapOrder));
      setError("");
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err.message ||
          "Unable to load kitchen orders. Please check your connection."
      );
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadOrders(true);

    // Refresh periodically so changes made in Orders can appear here.
    const refreshInterval = window.setInterval(() => {
      loadOrders(false);
    }, 15000);

    return () => window.clearInterval(refreshInterval);
  }, [loadOrders]);

  const summary = useMemo(
    () => ({
      pending: orders.filter((order) => order.status === "Pending").length,
      preparing: orders.filter((order) => order.status === "Preparing").length,
      ready: orders.filter((order) => order.status === "Ready").length,
      completed: orders.filter((order) => order.status === "Completed").length,
    }),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      // Cancelled orders do not belong on the kitchen preparation board.
      if (order.status === "Cancelled") {
        return false;
      }

      const matchesSearch =
        order.orderNumber?.toLowerCase().includes(query) ||
        order.customer.toLowerCase().includes(query) ||
        order.items.some((item) => item.name.toLowerCase().includes(query)) ||
        order.notes.toLowerCase().includes(query);

      const matchesType =
        orderTypeFilter === "All" || order.orderType === orderTypeFilter;

      const matchesCompletion =
        showCompleted || order.status !== "Completed";

      return matchesSearch && matchesType && matchesCompletion;
    });
  }, [orders, searchTerm, orderTypeFilter, showCompleted]);

  async function advanceOrder(orderId, nextStatus) {
    setUpdatingOrderId(orderId);
    setActionError("");

    try {
      const updatedOrder = await apiRequest(
        `/api/orders/${BRANCH_ID}/${orderId}`,
        {
          method: "PUT",
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      // Use the server response when available; otherwise update the local
      // view after the successful API response.
      if (updatedOrder && updatedOrder._id) {
        setOrders((previous) =>
          previous.map((order) =>
            order.id === orderId ? mapOrder(updatedOrder) : order
          )
        );
      } else {
        setOrders((previous) =>
          previous.map((order) =>
            order.id === orderId
              ? { ...order, status: nextStatus }
              : order
          )
        );
      }

      setLastUpdated(new Date());
    } catch (err) {
      setActionError(
        err.message ||
          "Unable to update this order. Please try again."
      );
    } finally {
      setUpdatingOrderId(null);
    }
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

        <button
          className="kitchen-clear-button"
          type="button"
          onClick={() => loadOrders(true)}
          disabled={isLoading || updatingOrderId !== null}
        >
          Refresh orders
        </button>
      </div>

      {lastUpdated && !error && (
        <p role="status" aria-live="polite">
          Last synchronized: {lastUpdated.toLocaleTimeString()}
        </p>
      )}

      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => loadOrders(true)}
            disabled={isLoading}
          >
            Try again
          </button>
        </div>
      )}

      {actionError && (
        <p role="alert">
          {actionError}
        </p>
      )}

      {isLoading ? (
        <div className="kitchen-stage-empty" role="status">
          <p>Loading kitchen orders...</p>
        </div>
      ) : !error ? (
        <>
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
                      const isUpdating = updatingOrderId === order.id;

                      return (
                        <article
                          className="kitchen-order-card"
                          key={order.id}
                        >
                          <div className="kitchen-order-card-header">
                            <strong>{order.orderNumber}</strong>
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
                              {order.orderType === "Dine-in" && order.table
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

                          {order.notes.trim() && (
                            <div className="kitchen-order-notes">
                              <span>Customer Demand</span>
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
                              disabled={isUpdating || updatingOrderId !== null}
                            >
                              {isUpdating ? "Updating..." : stage.actionLabel}
                              {!isUpdating && (
                                <span aria-hidden="true">→</span>
                              )}
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
                        <strong>{order.orderNumber}</strong>
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
        </>
      ) : null}
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