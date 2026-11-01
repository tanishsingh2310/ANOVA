
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Search,
  Truck,
  Utensils,
  ShoppingBag,
  X,
} from "lucide-react";

import { apiRequest } from "../../../services/api";
import "../../../styles/kitchen-workflow.css";

const ALL_BRANCHES = "all";
const COMPLETED_ITEMS_PER_PAGE = 5;

const ORDER_STATUSES = [
  "Pending",
  "Preparing",
  "Ready",
  "Out for Delivery",
  "Delivered",
  "Completed",
  "Cancelled",
];

const KITCHEN_STAGES = [
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
  },
];

const ORDER_TYPES = ["Dine-in", "Takeaway", "Delivery"];

function getId(value) {
  if (value && typeof value === "object") {
    return String(value._id || value.id || value.branchId || "");
  }

  return value == null ? "" : String(value);
}

function unwrapResponse(response) {
  let data = response?.data ?? response;

  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    data.data !== undefined
  ) {
    data = data.data;
  }

  return data;
}

function extractArray(response, key) {
  const data = unwrapResponse(response);

  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.orders)) return data.orders;
  if (Array.isArray(data?.branches)) return data.branches;

  return [];
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.data?.message ||
    error?.message ||
    fallback
  );
}

function normalizeStatus(status) {
  return (
    ORDER_STATUSES.find(
      (item) =>
        item.toLowerCase() === String(status || "").toLowerCase()
    ) || "Pending"
  );
}

function getCustomerName(order) {
  const candidates = [
    order?.customerName,
    typeof order?.customer === "string" ? order.customer : null,
    order?.customer?.name,
    order?.customer?.fullName,
  ];

  return (
    candidates.find(
      (value) =>
        typeof value === "string" &&
        value.trim() &&
        !/^[a-f\d]{24}$/i.test(value.trim())
    )?.trim() || "Walk-in customer"
  );
}

function getBranchName(branch) {
  if (!branch || typeof branch !== "object") return "";

  return (
    branch.name ||
    branch.branchName ||
    branch.branch_name ||
    branch.branchCode ||
    branch.code ||
    ""
  );
}

function mapOrder(order, fallbackBranchId = "", fallbackBranchName = "") {
  const id = getId(order?._id || order?.id);

  const branchId =
    getId(order?.branchId ?? order?.branch) || fallbackBranchId;

  const branchName =
    order?.branchId?.name ||
    getBranchName(order?.branch) ||
    order?.branchName ||
    fallbackBranchName;

  const rawItems = Array.isArray(order?.items) ? order.items : [];

  const items = rawItems.map((item) => {
    const menuItem =
      item?.menuItemId && typeof item.menuItemId === "object"
        ? item.menuItemId
        : null;

    return {
      name: item?.name || menuItem?.name || "Menu item",
      quantity: Math.max(1, Number(item?.quantity) || 1),
    };
  });

  const rawDate =
    order?.createdAt || order?.orderDate || order?.date || null;

  const parsedDate = rawDate ? new Date(rawDate) : null;

  return {
    id,
    branchId,
    branchName,
    orderNumber:
      order?.orderNumber ||
      (id ? `#${id.slice(-6).toUpperCase()}` : "Order"),
    customer: getCustomerName(order),
    orderType: ORDER_TYPES.includes(order?.orderType)
      ? order.orderType
      : "Dine-in",
    table:
      typeof order?.table === "object"
        ? order.table?.tableNumber || order.table?.name || ""
        : order?.table || order?.tableNumber || "",
    items,
    status: normalizeStatus(order?.status),
    createdAt:
      parsedDate && Number.isFinite(parsedDate.getTime())
        ? parsedDate.toISOString()
        : null,
    notes: typeof order?.notes === "string" ? order.notes : "",
  };
}

function getElapsedMinutes(createdAt) {
  if (!createdAt) return 0;

  const timestamp = new Date(createdAt).getTime();

  if (!Number.isFinite(timestamp)) return 0;

  return Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
}

function formatElapsedTime(minutes) {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hr`;
}

function getOrderTypeIcon(type) {
  if (type === "Delivery") return Truck;
  if (type === "Takeaway") return ShoppingBag;

  return Utensils;
}

function getPaginationPages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

function compareOrderAge(a, b) {
  const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

  if (dateA !== dateB) return dateA - dateB;

  return a.id.localeCompare(b.id);
}

function KitchenWorkflow({
  branchid = ALL_BRANCHES,
  branches = [],
  onBranchChange,
  branchLoading = false,
  branchError = "",
}) {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("All");
  const [showCompleted, setShowCompleted] = useState(false);
  const [completedCurrentPage, setCompletedCurrentPage] = useState(1);

  const [localBranchId, setLocalBranchId] = useState(
    String(branchid || ALL_BRANCHES)
  );

  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalBranchId(String(branchid || ALL_BRANCHES));
  }, [branchid]);

  const selectedBranchId = String(localBranchId || ALL_BRANCHES);

  const branchOptions = useMemo(
    () => (Array.isArray(branches) ? branches : []),
    [branches]
  );

  const branchNames = useMemo(() => {
    const names = new Map();

    branchOptions.forEach((branch) => {
      const id = getId(branch);

      if (id) {
        names.set(id, getBranchName(branch) || "Unnamed Branch");
      }
    });

    return names;
  }, [branchOptions]);

  const currentBranchLabel =
    selectedBranchId === ALL_BRANCHES
      ? "All Branches"
      : branchNames.get(selectedBranchId) || "Selected Branch";

  const handleBranchChange = useCallback(
    (nextBranchId) => {
      setLocalBranchId(nextBranchId);
      setCompletedCurrentPage(1);
      setSearchTerm("");
      setOrderTypeFilter("All");
      setShowCompleted(false);
      setError("");
      setActionError("");
      onBranchChange?.(nextBranchId);
    },
    [onBranchChange]
  );

  const loadOrders = useCallback(
    async (active = () => true) => {
      if (branchLoading) return;

      if (branchError) {
        if (active()) {
          setOrders([]);
          setError(branchError);
          setIsLoading(false);
        }
        return;
      }

      setError("");

      try {
        if (selectedBranchId === ALL_BRANCHES && !branchOptions.length) {
          if (active()) {
            setOrders([]);
            setError("No branches are available.");
            setIsLoading(false);
          }
          return;
        }

        const selectedBranches =
          selectedBranchId === ALL_BRANCHES
            ? branchOptions
            : branchOptions.filter(
                (branch) => getId(branch) === selectedBranchId
              );

        if (!selectedBranches.length) {
          if (active()) {
            setOrders([]);
            setError("The selected branch could not be found.");
            setIsLoading(false);
          }
          return;
        }

        const results = await Promise.allSettled(
          selectedBranches.map(async (branch) => {
            const id = getId(branch);

            if (!id) {
              throw new Error("A branch is missing its ID.");
            }

            const response = await apiRequest(
              `/api/orders/${encodeURIComponent(id)}`
            );

            return extractArray(response, "orders").map((order) =>
              mapOrder(
                order,
                id,
                getBranchName(branch) || "Unnamed Branch"
              )
            );
          })
        );

        if (!active()) return;

        const successfulResults = results
          .filter((result) => result.status === "fulfilled")
          .flatMap((result) => result.value)
          .filter((order) => order.id);

        const failedCount = results.filter(
          (result) => result.status === "rejected"
        ).length;

        const uniqueOrders = new Map();

        successfulResults.forEach((order) => {
          uniqueOrders.set(`${order.branchId}-${order.id}`, order);
        });

        setOrders(Array.from(uniqueOrders.values()));

        if (failedCount === results.length) {
          setError("Unable to load orders. Please try again.");
        } else if (failedCount > 0) {
          setError(
            `Some branch orders could not be loaded (${failedCount} failed request(s)).`
          );
        } else {
          setError("");
        }
      } catch (err) {
        if (active()) {
          setError(
            getErrorMessage(
              err,
              "Unable to load kitchen orders. Please check your connection."
            )
          );
        }
      } finally {
        if (active()) setIsLoading(false);
      }
    },
    [branchOptions, branchLoading, branchError, selectedBranchId]
  );

  useEffect(() => {
    let active = true;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    loadOrders(() => active);

    return () => {
      active = false;
    };
  }, [loadOrders, refreshKey]);

  useEffect(() => {
    if (branchLoading || branchError) return undefined;

    let active = true;

    const intervalId = window.setInterval(() => {
      loadOrders(() => active);
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [loadOrders, branchLoading, branchError]);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      if (order.status === "Cancelled") return false;

      const searchableText = [
        order.orderNumber,
        order.id,
        order.customer,
        order.branchName,
        order.orderType,
        order.table,
        order.notes,
        ...order.items.map((item) => item.name),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchableText.includes(query);

      const matchesType =
        orderTypeFilter === "All" ||
        order.orderType.toLowerCase() === orderTypeFilter.toLowerCase();

      const matchesCompletion =
        showCompleted ||
        !["Completed", "Delivered"].includes(order.status);

      return matchesSearch && matchesType && matchesCompletion;
    });
  }, [orders, searchTerm, orderTypeFilter, showCompleted]);

  const completedOrders = useMemo(
    () =>
      filteredOrders
        .filter((order) =>
          ["Completed", "Delivered"].includes(order.status)
        )
        .sort(compareOrderAge),
    [filteredOrders]
  );

  const deliveryOrders = useMemo(
    () =>
      filteredOrders
        .filter((order) => order.status === "Out for Delivery")
        .sort(compareOrderAge),
    [filteredOrders]
  );

  // Queue rule: display only the oldest order for each active kitchen stage.
  // When it advances, the next oldest order automatically becomes visible.
  const stageQueues = useMemo(() => {
    const queues = {};

    KITCHEN_STAGES.forEach((stage) => {
      const queue = filteredOrders
        .filter((order) => order.status === stage.name)
        .sort(compareOrderAge);

      queues[stage.name] = {
        total: queue.length,
        current: queue.length > 0 ? queue[0] : null,
        waiting: Math.max(0, queue.length - 1),
      };
    });

    return queues;
  }, [filteredOrders]);

  const completedTotalPages = Math.ceil(
    completedOrders.length / COMPLETED_ITEMS_PER_PAGE
  );

  const safeCompletedPage = Math.min(
    completedCurrentPage,
    Math.max(1, completedTotalPages)
  );

  const paginatedCompletedOrders = completedOrders.slice(
    (safeCompletedPage - 1) * COMPLETED_ITEMS_PER_PAGE,
    safeCompletedPage * COMPLETED_ITEMS_PER_PAGE
  );

  const completedPaginationPages = getPaginationPages(
    safeCompletedPage,
    completedTotalPages
  );

  const completedStart =
    completedOrders.length === 0
      ? 0
      : (safeCompletedPage - 1) * COMPLETED_ITEMS_PER_PAGE + 1;

  const completedEnd = Math.min(
    safeCompletedPage * COMPLETED_ITEMS_PER_PAGE,
    completedOrders.length
  );

  const hasActiveFilters =
    searchTerm !== "" || orderTypeFilter !== "All";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompletedCurrentPage((page) =>
      Math.min(page, Math.max(1, completedTotalPages))
    );
  }, [completedTotalPages]);

  function clearFilters() {
    setSearchTerm("");
    setOrderTypeFilter("All");
    setCompletedCurrentPage(1);
  }

  function refreshOrders() {
    setActionError("");
    setRefreshKey((current) => current + 1);
  }

  async function advanceOrder(orderId, branchId, nextStatus) {
    if (updatingOrderId !== null) return;

    const currentOrder = orders.find(
      (order) => order.id === orderId && order.branchId === branchId
    );

    if (!currentOrder || !currentOrder.branchId) {
      setActionError("Unable to identify the branch for this order.");
      return;
    }

    const currentStage = KITCHEN_STAGES.find(
      (stage) => stage.name === currentOrder.status
    );

    if (!currentStage) return;

    let targetStatus = nextStatus;

    if (currentOrder.status === "Ready") {
      targetStatus =
        currentOrder.orderType === "Delivery"
          ? "Out for Delivery"
          : "Completed";
    }

    if (
      !targetStatus ||
      !ORDER_STATUSES.includes(targetStatus) ||
      (currentStage.nextStatus && currentStage.nextStatus !== nextStatus)
    ) {
      setActionError("This order cannot move to that workflow stage.");
      return;
    }

    setUpdatingOrderId(orderId);
    setActionError("");

    try {
      const response = await apiRequest(
        `/api/orders/${encodeURIComponent(
          currentOrder.branchId
        )}/${encodeURIComponent(orderId)}`,
        {
          method: "PUT",
          body: JSON.stringify({ status: targetStatus }),
        }
      );

      const data = unwrapResponse(response);
      const returnedOrder = data?.order || data?.data?.order || data;

      if (
        returnedOrder &&
        typeof returnedOrder === "object" &&
        (returnedOrder._id || returnedOrder.id)
      ) {
        const normalized = mapOrder(
          returnedOrder,
          currentOrder.branchId,
          branchNames.get(currentOrder.branchId) ||
            currentOrder.branchName
        );

        setOrders((previous) =>
          previous.map((order) =>
            order.id === orderId &&
            order.branchId === currentOrder.branchId
              ? normalized
              : order
          )
        );
      } else {
        setOrders((previous) =>
          previous.map((order) =>
            order.id === orderId &&
            order.branchId === currentOrder.branchId
              ? { ...order, status: targetStatus }
              : order
          )
        );
      }
    } catch (err) {
      setActionError(
        getErrorMessage(
          err,
          "Unable to update this order. Please try again."
        )
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  function renderOrderCard(order, stage) {
    const elapsed = getElapsedMinutes(order.createdAt);
    const isPriority = elapsed >= 20;
    const isUpdating =
      updatingOrderId === order.id;
    const TypeIcon = getOrderTypeIcon(order.orderType);

    const readyActionLabel =
      order.orderType === "Delivery"
        ? "Send for Delivery"
        : "Complete Order";

    return (
      <article
        className="kitchen-order-card"
        key={`${order.branchId}-${order.id}`}
      >
        <div className="kitchen-order-card-header">
          <strong>{order.orderNumber}</strong>

          {order.branchName && (
            <span className="kitchen-order-branch">
              {order.branchName}
            </span>
          )}

          <span
            className={`kitchen-order-timer ${
              isPriority ? "priority" : ""
            }`}
          >
            <Clock3 size={13} aria-hidden="true" />
            {formatElapsedTime(elapsed)}
          </span>
        </div>

        <div className="kitchen-order-customer">
          <h4>{order.customer}</h4>
          <span className="kitchen-type-badge">
            <TypeIcon size={13} aria-hidden="true" />
            {order.orderType}
            {order.orderType === "Dine-in" && order.table
              ? ` · ${order.table}`
              : ""}
          </span>
        </div>

        {isPriority && (
          <div className="kitchen-priority-label">
            <AlertCircle size={14} aria-hidden="true" />
            Waiting longer than 20 minutes
          </div>
        )}

        <div className="kitchen-order-items">
          <span className="kitchen-section-label">ORDER ITEMS</span>

          {order.items.map((item, index) => (
            <div
              className="kitchen-order-item"
              key={`${order.branchId}-${order.id}-${item.name}-${index}`}
            >
              <span>{item.name}</span>
              <strong>× {item.quantity}</strong>
            </div>
          ))}

          {order.items.length === 0 && (
            <p>No item details available.</p>
          )}
        </div>

        {order.notes.trim() && (
          <div className="kitchen-order-notes">
            <strong>Customer notes</strong>
            <p>{order.notes}</p>
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
              advanceOrder(
                order.id,
                order.branchId,
                stage.nextStatus ||
                  (order.orderType === "Delivery"
                    ? "Out for Delivery"
                    : "Completed")
              )
            }
            disabled={updatingOrderId !== null}
          >
            {isUpdating ? (
              <>
                <LoaderCircle
                  size={15}
                  className="kitchen-spin"
                  aria-hidden="true"
                />
                Updating...
              </>
            ) : (
              <>
                {stage.name === "Ready"
                  ? readyActionLabel
                  : stage.actionLabel}
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </div>
      </article>
    );
  }

  return (
    <section className="kitchen-page">
      <div className="kitchen-page-header">
        <div className="kitchen-heading">
          <p>
            Coordinate preparation, monitor order progress, and keep
            kitchen service running smoothly.
          </p>
        </div>

        <div className="kitchen-header-actions">
          <button
            type="button"
            className="kitchen-secondary-button"
            onClick={refreshOrders}
            disabled={
              isLoading || branchLoading || updatingOrderId !== null
            }
          >
            <RefreshCw
              size={15}
              className={isLoading ? "kitchen-spin" : ""}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="kitchen-filter-card">
        <div className="kitchen-toolbar">
          <label className="kitchen-search">
            <Search size={17} aria-hidden="true" />

            <input
              type="search"
              placeholder="Search order, customer or food item..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search kitchen orders"
            />

            {searchTerm && (
              <button
                type="button"
                className="kitchen-search-clear"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </label>

          <label className="kitchen-filter">
            <span>Branch</span>
            <select
              value={selectedBranchId}
              onChange={(event) =>
                handleBranchChange(event.target.value)
              }
              disabled={
                branchLoading ||
                Boolean(branchError) ||
                !branchOptions.length
              }
              aria-label="Filter by branch"
            >
              <option value={ALL_BRANCHES}>All Branches</option>

              {branchOptions.map((branch) => {
                const id = getId(branch);

                if (!id) return null;

                return (
                  <option key={id} value={id}>
                    {getBranchName(branch) || id}
                  </option>
                );
              })}
            </select>

            {branchError && (
              <small className="kitchen-filter-error" role="alert">
                {branchError}
              </small>
            )}
          </label>

          <label className="kitchen-filter">
            <span>Order type</span>
            <select
              value={orderTypeFilter}
              onChange={(event) =>
                setOrderTypeFilter(event.target.value)
              }
            >
              <option value="All">All types</option>
              {ORDER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="kitchen-completed-toggle">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(event) =>
                setShowCompleted(event.target.checked)
              }
            />
            <span>Show completed</span>
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              className="kitchen-secondary-button"
              onClick={clearFilters}
            >
              <X size={15} aria-hidden="true" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="kitchen-notice kitchen-notice-error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError("")}
            aria-label="Dismiss error"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div className="kitchen-workflow-heading">
        <div>
          <h2>Order Preparation Board</h2>
          <p>
            {isLoading
              ? "Loading kitchen orders..."
              : error || branchError
                ? "Orders could not be loaded"
                : `${filteredOrders.length} ${
                    filteredOrders.length === 1 ? "order" : "orders"
                  } found`}
          </p>
        </div>

        <span className="kitchen-current-branch">
          {currentBranchLabel}
        </span>
      </div>

      {(error || branchError) && (
        <div className="kitchen-inline-error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error || branchError}</span>
          <button
            type="button"
            className="kitchen-secondary-button"
            onClick={refreshOrders}
            disabled={isLoading || branchLoading}
          >
            <RefreshCw size={14} aria-hidden="true" />
            Try Again
          </button>
        </div>
      )}

      {isLoading || branchLoading ? (
        <div className="kitchen-state-card" role="status">
          <LoaderCircle
            size={26}
            className="kitchen-spin"
            aria-hidden="true"
          />
          <strong>
            {branchLoading
              ? "Loading branches"
              : "Loading kitchen orders"}
          </strong>
          <span>Please wait while we retrieve your orders.</span>
        </div>
      ) : !error && !branchError ? (
        <>
          <div className="kitchen-workflow-board">
            {KITCHEN_STAGES.map((stage) => {
              const queue = stageQueues[stage.name];
              const order = queue.current;

              return (
                <section
                  className={`kitchen-stage ${stage.className}`}
                  key={stage.name}
                >
                  <div className="kitchen-stage-header">
                    <div className="kitchen-stage-title">
                      <span className="kitchen-stage-indicator" />
                      <h3>{stage.name}</h3>
                      <span className="kitchen-stage-count">
                        {queue.total}
                      </span>
                    </div>

                    <p>{stage.description}</p>
                    {queue.waiting > 0 && (
                      <small className="kitchen-queue-waiting">
                        {queue.waiting}{" "}
                        {queue.waiting === 1 ? "order" : "orders"} waiting
                        in queue
                      </small>
                    )}
                  </div>

                  <div className="kitchen-stage-orders">
                    {order ? (
                      renderOrderCard(order, stage)
                    ) : (
                      <div className="kitchen-stage-empty">
                        <CheckCircle2 size={21} aria-hidden="true" />
                        <p>No orders in this stage</p>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          {deliveryOrders.length > 0 && (
            <section className="kitchen-completed-section">
              <div className="kitchen-workflow-heading">
                <div>
                  <h2>Out for Delivery</h2>
                  <p>Orders awaiting delivery completion.</p>
                </div>

                <span className="kitchen-order-count">
                  {deliveryOrders.length} in delivery
                </span>
              </div>

              <div className="kitchen-completed-list">
                {deliveryOrders.map((order) => (
                  <article
                    className="kitchen-completed-card"
                    key={`${order.branchId}-${order.id}`}
                  >
                    <div>
                      <strong>{order.orderNumber}</strong>
                      <span>{order.customer}</span>
                      {order.branchName && <span>{order.branchName}</span>}
                    </div>

                    <span className="kitchen-completed-type">
                      <Truck size={14} aria-hidden="true" />
                      {order.orderType} · Out for Delivery
                    </span>
                  </article>
                ))}
              </div>
            </section>
          )}

          {showCompleted && (
            <section className="kitchen-completed-section">
              <div className="kitchen-workflow-heading">
                <div>
                  <h2>Completed Orders</h2>
                  <p>
                    Orders that have completed the kitchen or delivery
                    workflow.
                  </p>
                </div>

                <span className="kitchen-order-count">
                  {completedOrders.length} completed
                </span>
              </div>

              <div className="kitchen-completed-list">
                {paginatedCompletedOrders.map((order) => (
                  <article
                    className="kitchen-completed-card"
                    key={`${order.branchId}-${order.id}`}
                  >
                    <span className="kitchen-completed-check">
                      <CheckCircle2 size={18} aria-hidden="true" />
                    </span>

                    <div>
                      <strong>{order.orderNumber}</strong>
                      <span>{order.customer}</span>
                      {order.branchName && <span>{order.branchName}</span>}
                    </div>

                    <span className="kitchen-completed-type">
                      {order.orderType} · {order.status}
                    </span>
                  </article>
                ))}

                {completedOrders.length === 0 && (
                  <div className="kitchen-completed-empty">
                    No completed orders match your current filters.
                  </div>
                )}
              </div>

              {completedTotalPages > 1 && (
                <div className="kitchen-pagination">
                  <span className="kitchen-pagination-info">
                    Showing {completedStart}–{completedEnd} of{" "}
                    {completedOrders.length} completed orders
                  </span>

                  <div className="kitchen-pagination-buttons">
                    <button
                      type="button"
                      className="kitchen-pagination-button"
                      disabled={safeCompletedPage === 1}
                      onClick={() =>
                        setCompletedCurrentPage((page) =>
                          Math.max(1, page - 1)
                        )
                      }
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </button>

                    {completedPaginationPages.map((page, index) =>
                      page === "..." ? (
                        <span
                          key={`completed-ellipsis-${index}`}
                          className="kitchen-pagination-ellipsis"
                          aria-hidden="true"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={page}
                          type="button"
                          className={`kitchen-pagination-button ${
                            safeCompletedPage === page ? "active" : ""
                          }`}
                          onClick={() => setCompletedCurrentPage(page)}
                          aria-current={
                            safeCompletedPage === page ? "page" : undefined
                          }
                        >
                          {page}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      className="kitchen-pagination-button"
                      disabled={safeCompletedPage === completedTotalPages}
                      onClick={() =>
                        setCompletedCurrentPage((page) =>
                          Math.min(completedTotalPages, page + 1)
                        )
                      }
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      ) : null}
    </section>
  );
}

export default KitchenWorkflow;
