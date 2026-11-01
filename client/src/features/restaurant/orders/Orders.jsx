import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  Truck,
  Utensils,
  X,
} from "lucide-react";

import { apiRequest } from "../../../services/api";
import "../../../styles/orders.css";

const ALL_BRANCHES = "all";
const ITEMS_PER_PAGE = 10;

const ORDER_STATUSES = [
  "Pending",
  "Preparing",
  "Ready",
  "Out for Delivery",
  "Delivered",
  "Completed",
  "Cancelled",
];

const ORDER_TYPES = ["Dine-in", "Takeaway", "Delivery"];

const EMPTY_FORM = {
  customer: "",
  branchId: "",
  orderType: "Dine-in",
  tableId: "",
  items: [{ menuItemId: "", quantity: 1 }],
  status: "Pending",
  notes: "",
};

function getId(value) {
  if (value && typeof value === "object") {
    return String(value._id || value.id || "");
  }

  return value == null ? "" : String(value);
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.data?.message ||
    error?.message ||
    fallback
  );
}

function unwrapResponse(response) {
  return response?.data ?? response;
}

function extractArray(response, key) {
  const data = unwrapResponse(response);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];

  return [];
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function normalizeStatus(status) {
  return (
    ORDER_STATUSES.find(
      (item) =>
        item.toLowerCase() === String(status || "").toLowerCase()
    ) || "Pending"
  );
}

function getOrderTotal(items = []) {
  return items.reduce((total, item) => {
    const price = Number(item.price ?? item.menuItemId?.price ?? 0);
    const quantity = Number(item.quantity ?? 1);

    return total + price * quantity;
  }, 0);
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

function normalizeOrder(order, fallbackBranchId = "") {
  const branchId =
    getId(order?.branchId ?? order?.branch) || fallbackBranchId;

  const rawItems = Array.isArray(order?.items) ? order.items : [];

  const items = rawItems.map((item) => {
    const menuItem =
      item.menuItemId && typeof item.menuItemId === "object"
        ? item.menuItemId
        : null;

    return {
      ...item,
      menuItemId: getId(item.menuItemId),
      name: item.name || menuItem?.name || "Menu item",
      price: Number(item.price ?? menuItem?.price ?? 0),
      quantity: Math.max(1, Number(item.quantity) || 1),
    };
  });

  const total =
    order?.totalAmount ??
    order?.totalPrice ??
    order?.total ??
    getOrderTotal(items);

  return {
    ...order,
    id: getId(order?._id || order?.id),
    branchId,
    branchName:
      order?.branchId?.name ||
      order?.branch?.name ||
      order?.branchName ||
      "",
    customer: getCustomerName(order),
    orderType: order?.orderType || "Dine-in",
    tableId: getId(order?.tableId || order?.table),
    items,
    status: normalizeStatus(order?.status),
    notes: order?.notes || "",
    totalAmount: Number(total) || 0,
    createdAt:
      order?.createdAt || order?.orderDate || order?.date || null,
  };
}

function getStatusClass(status) {
  return String(status || "pending")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function getTypeIcon(type) {
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

function Orders({
  branchid = ALL_BRANCHES,
  branches = [],
  onBranchChange,
  branchLoading = false,
  branchError = "",
}) {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState(null);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formDataLoading, setFormDataLoading] = useState(false);

  const [deletingOrder, setDeletingOrder] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const selectedBranchId = String(branchid || ALL_BRANCHES);

  const branchOptions = useMemo(
    () => (Array.isArray(branches) ? branches : []),
    [branches]
  );

  const branchNames = useMemo(() => {
    const names = new Map();

    branchOptions.forEach((item) => {
      const id = getId(item?._id || item?.id);

      if (id) {
        names.set(
          id,
          item.name || item.branchName || "Unnamed Branch"
        );
      }
    });

    return names;
  }, [branchOptions]);

  const currentBranchLabel =
    selectedBranchId === ALL_BRANCHES
      ? "All Branches"
      : branchNames.get(selectedBranchId) || "Selected Branch";

  const notify = useCallback((type, message) => {
    setNotice({
      type,
      message,
      id: `${Date.now()}-${Math.random()}`,
    });
  }, []);

  const loadOrders = useCallback(
    async (active = () => true) => {
      if (branchLoading) return;

      if (branchError) {
        setOrders([]);
        setLoadError(branchError);
        setLoading(false);
        return;
      }

      setLoadError("");

      try {
        let loadedOrders = [];

        if (selectedBranchId === ALL_BRANCHES) {
          if (!branchOptions.length) {
            if (active()) {
              setOrders([]);
              setLoading(false);
            }
            return;
          }

          const results = await Promise.all(
            branchOptions.map(async (item) => {
              const id = getId(item?._id || item?.id);

              if (!id) {
                throw new Error(
                  "A branch is missing its ID. Please refresh the branches."
                );
              }

              const response = await apiRequest(`/api/orders/${id}`);
              const data = extractArray(response, "orders");

              if (!Array.isArray(data)) {
                throw new Error(
                  `Invalid orders response for ${
                    item.name || item.branchName || id
                  }.`
                );
              }

              return data.map((order) => ({
                ...normalizeOrder(order, id),
                branchName:
                  order?.branchId?.name ||
                  order?.branchName ||
                  item.name ||
                  item.branchName ||
                  "Unnamed Branch",
              }));
            })
          );

          if (!active()) return;

          const uniqueOrders = new Map();

          results.flat().forEach((order) => {
            if (!order.id) return;
            uniqueOrders.set(order.id, order);
          });

          loadedOrders = Array.from(uniqueOrders.values());
        } else {
          const response = await apiRequest(
            `/api/orders/${selectedBranchId}`
          );

          const data = extractArray(response, "orders");

          if (!Array.isArray(data)) {
            throw new Error(
              "The server returned an invalid orders response."
            );
          }

          loadedOrders = data.map((order) =>
            normalizeOrder(order, selectedBranchId)
          );
        }

        if (active()) {
          setOrders(loadedOrders);
        }
      } catch (error) {
        if (active()) {
          setLoadError(
            getErrorMessage(error, "Unable to load orders.")
          );
        }
      } finally {
        if (active()) {
          setLoading(false);
        }
      }
    },
    [selectedBranchId, branchOptions, branchLoading, branchError]
  );

  useEffect(() => {
    let active = true;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    loadOrders(() => active);

    return () => {
      active = false;
    };
  }, [loadOrders, refreshKey]);

  useEffect(() => {
    if (branchError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadError(branchError);
    }
  }, [branchError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch("");
    setStatusFilter("All");
    setTypeFilter("All");
    setDateFilter("");
    setCurrentPage(1);
  }, [selectedBranchId]);

  useEffect(() => {
    let active = true;

    async function loadFormData() {
      const id = String(form.branchId || "");

      setMenuItems([]);
      setTables([]);

      if (!showForm || !id || id === ALL_BRANCHES) {
        setFormDataLoading(false);
        return;
      }

      setFormDataLoading(true);
      setFormError("");

      try {
        const [menuResponse, tablesResponse] = await Promise.all([
          apiRequest(`/api/menu/${id}`),
          apiRequest(`/api/tables/${id}`),
        ]);

        if (!active) return;

        const menuData = unwrapResponse(menuResponse);
        const tableData = unwrapResponse(tablesResponse);

        const loadedMenuItems = Array.isArray(menuData)
          ? menuData
          : Array.isArray(menuData?.menuItems)
            ? menuData.menuItems
            : Array.isArray(menuData?.data?.menuItems)
              ? menuData.data.menuItems
              : Array.isArray(menuData?.data)
                ? menuData.data
                : [];

        const loadedTables = Array.isArray(tableData)
          ? tableData
          : Array.isArray(tableData?.tables)
            ? tableData.tables
            : Array.isArray(tableData?.data?.tables)
              ? tableData.data.tables
              : Array.isArray(tableData?.data)
                ? tableData.data
                : [];

        setMenuItems(loadedMenuItems);
        setTables(loadedTables);

        setForm((current) => ({
          ...current,
          items: [{ menuItemId: "", quantity: 1 }],
          tableId: "",
        }));
      } catch (error) {
        if (active) {
          setMenuItems([]);
          setTables([]);
          setFormError(
            getErrorMessage(
              error,
              "Unable to load menu items and tables for this branch."
            )
          );
        }
      } finally {
        if (active) {
          setFormDataLoading(false);
        }
      }
    }

    loadFormData();

    return () => {
      active = false;
    };
  }, [showForm, form.branchId]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders
      .filter((order) => {
        const matchesSearch =
          !query ||
          [
            order.customer,
            order.id,
            order.branchName,
            order.orderType,
            order.status,
            ...(order.items || []).map((item) => item.name),
          ].some((value) =>
            String(value || "").toLowerCase().includes(query)
          );

        const matchesStatus =
          statusFilter === "All" || order.status === statusFilter;

        const matchesType =
          typeFilter === "All" || order.orderType === typeFilter;

        const orderDate = order.createdAt
          ? new Date(order.createdAt)
          : null;

        const normalizedDate =
          orderDate && !Number.isNaN(orderDate.getTime())
            ? `${orderDate.getFullYear()}-${String(
                orderDate.getMonth() + 1
              ).padStart(2, "0")}-${String(
                orderDate.getDate()
              ).padStart(2, "0")}`
            : "";

        return (
          matchesSearch &&
          matchesStatus &&
          matchesType &&
          (!dateFilter || normalizedDate === dateFilter)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );
  }, [orders, search, statusFilter, typeFilter, dateFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [search, statusFilter, typeFilter, dateFilter, selectedBranchId]);

  const totalPages = Math.ceil(
    filteredOrders.length / ITEMS_PER_PAGE
  );

  const paginationPages = getPaginationPages(
    currentPage,
    totalPages
  );

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const availableTables = useMemo(() => {
    return tables.filter((table) => {
      const status = String(table.status || "").toLowerCase();

      return (
        !status ||
        ["available", "vacant", "active"].includes(status) ||
        getId(table._id || table.id) === form.tableId
      );
    });
  }, [tables, form.tableId]);

  function refreshOrders() {
    setNotice(null);
    setRefreshKey((current) => current + 1);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("All");
    setTypeFilter("All");
    setDateFilter("");
  }

  function openAddForm() {
    setEditingId(null);
    setFormError("");
    setNotice(null);

    setForm({
      ...EMPTY_FORM,
      branchId: "",
    });

    setShowForm(true);
  }

  function openEditForm(order) {
    if (order.status !== "Pending") {
      notify("error", "Only pending orders can be edited.");
      return;
    }

    setEditingId(order.id);
    setFormError("");
    setNotice(null);

    setForm({
      customer:
        order.customer === "Walk-in customer" ? "" : order.customer,
      branchId: order.branchId,
      orderType: order.orderType,
      tableId: order.tableId || "",
      items:
        order.items.length > 0
          ? order.items.map((item) => ({
              menuItemId: item.menuItemId,
              quantity: Math.max(1, Number(item.quantity) || 1),
            }))
          : [{ menuItemId: "", quantity: 1 }],
      status: order.status,
      notes: order.notes || "",
    });

    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    if (name === "branchId") {
      setForm((current) => ({
        ...current,
        branchId: value,
        tableId: "",
        items: [{ menuItemId: "", quantity: 1 }],
      }));

      setMenuItems([]);
      setTables([]);
      setFormError("");
      return;
    }

    if (name === "orderType") {
      setForm((current) => ({
        ...current,
        orderType: value,
        tableId: value === "Dine-in" ? current.tableId : "",
      }));
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
    setFormError("");
  }

  function handleItemChange(index, field, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        index === itemIndex
          ? { ...item, [field]: value }
          : item
      ),
    }));
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        { menuItemId: "", quantity: 1 },
      ],
    }));
  }

  function removeItem(index) {
    setForm((current) => {
      const items = current.items.filter(
        (_, itemIndex) => itemIndex !== index
      );

      return {
        ...current,
        items:
          items.length > 0
            ? items
            : [{ menuItemId: "", quantity: 1 }],
      };
    });
  }

  function validateForm() {
    if (
      !form.branchId ||
      !branchOptions.some(
        (item) => getId(item._id || item.id) === form.branchId
      )
    ) {
      return "Please select a valid branch.";
    }

    if (!form.customer.trim()) {
      return "Please enter the customer's name.";
    }

    if (!ORDER_TYPES.includes(form.orderType)) {
      return "Please select a valid order type.";
    }

    if (
      form.orderType === "Dine-in" &&
      !availableTables.some(
        (table) =>
          getId(table._id || table.id) === form.tableId
      )
    ) {
      return "Please select an available table.";
    }

    if (!form.items.length) {
      return "Add at least one menu item.";
    }

    for (const item of form.items) {
      if (
        !menuItems.some(
          (menu) =>
            getId(menu._id || menu.id) === item.menuItemId
        )
      ) {
        return "Select a valid menu item for every order row.";
      }

      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity < 1) {
        return "Each quantity must be a whole number greater than zero.";
      }
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      branchId: form.branchId,
      customer: form.customer.trim(),
      orderType: form.orderType,
      tableId: form.orderType === "Dine-in" ? form.tableId : null,
      items: form.items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: Number(item.quantity),
      })),
      status: editingId ? form.status : "Pending",
      notes: form.notes.trim(),
    };

    setSaving(true);
    setFormError("");
    setNotice(null);

    try {
      if (editingId) {
        await apiRequest(
          `/api/orders/${form.branchId}/${editingId}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );

        notify("success", "Order updated successfully.");
      } else {
        await apiRequest("/api/orders", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        notify("success", "Order created successfully.");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setFormError(
        getErrorMessage(error, "Unable to save the order.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deletingOrder || deleting) return;

    const order = deletingOrder;

    if (!order.id || !order.branchId) {
      notify("error", "The order's branch or ID could not be identified.");
      return;
    }

    setDeleting(true);
    setNotice(null);

    try {
      await apiRequest(
        `/api/orders/${order.branchId}/${order.id}`,
        { method: "DELETE" }
      );

      setOrders((current) =>
        current.filter(
          (item) =>
            !(
              item.id === order.id &&
              item.branchId === order.branchId
            )
        )
      );

      setDeletingOrder(null);
      notify("success", "Order deleted successfully.");
      setRefreshKey((current) => current + 1);
    } catch (error) {
      notify(
        "error",
        getErrorMessage(error, "Unable to delete the order.")
      );
    } finally {
      setDeleting(false);
    }
  }

  const estimatedTotal = form.items.reduce((total, item) => {
    const menuItem = menuItems.find(
      (menu) => getId(menu._id || menu.id) === item.menuItemId
    );

    return (
      total +
      Number(menuItem?.price || 0) * Number(item.quantity || 0)
    );
  }, 0);

  return (
    <section className="orders-management">
      <div className="orders-page-heading">
        <div className="orders-page-heading-copy">
          <p>
            Manage restaurant orders, monitor preparation, and coordinate
            service across your branches.
          </p>
        </div>

        <div className="orders-header-actions">
          <button
            type="button"
            className="orders-primary-button"
            onClick={openAddForm}
            disabled={branchLoading || !branchOptions.length}
          >
            <Plus size={17} aria-hidden="true" />
            New Order
          </button>

          <button
            type="button"
            className="orders-secondary-button orders-refresh-button"
            onClick={refreshOrders}
            disabled={loading || branchLoading}
          >
            <RefreshCw
              size={15}
              className={loading ? "orders-spin" : ""}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`orders-notice orders-notice-${notice.type}`}
          role={notice.type === "error" ? "alert" : "status"}
          key={notice.id}
        >
          {notice.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}

          <span>{notice.message}</span>

          <button
            type="button"
            className="orders-notice-close"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="orders-filter-card">
        <div className="orders-toolbar">
          <label className="orders-search">
            <Search size={17} aria-hidden="true" />

            <input
              type="search"
              placeholder="Search customer, order ID or menu item..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search orders"
            />

            {search && (
              <button
                type="button"
                className="orders-search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </label>

          <label className="orders-filter">
            <span>Branch</span>
            <select
              value={selectedBranchId}
              onChange={(event) => {
                setNotice(null);
                onBranchChange?.(event.target.value);
              }}
              disabled={
                branchLoading ||
                Boolean(branchError) ||
                !branchOptions.length
              }
              aria-label="Filter by branch"
            >
              <option value={ALL_BRANCHES}>All Branches</option>
              {branchOptions.map((branch) => {
                const id = String(branch._id || branch.id);

                return (
                  <option key={id} value={id}>
                    {branch.name || branch.branchName || id}
                  </option>
                );
              })}
            </select>

            {branchError && (
              <small className="orders-filter-error" role="alert">
                {branchError}
              </small>
            )}
          </label>

          <label className="orders-filter">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All statuses</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="orders-filter">
            <span>Order type</span>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="All">All types</option>
              {ORDER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="orders-filter">
            <span>Order date</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="orders-table-container">
        <div className="orders-table-heading">
          <div>
            <h2>Restaurant Orders</h2>
            <p>
              {loading
                ? "Loading orders..."
                : loadError
                  ? "Orders could not be loaded"
                  : `${filteredOrders.length} ${
                      filteredOrders.length === 1 ? "order" : "orders"
                    } found`}
            </p>
          </div>

          <span className="orders-current-branch">
            {currentBranchLabel}
          </span>
        </div>

        {loadError && (
          <div className="orders-inline-error" role="alert">
            <AlertCircle size={18} />
            <span>{loadError}</span>
            <button
              type="button"
              className="orders-secondary-button"
              onClick={refreshOrders}
            >
              <RefreshCw size={14} />
              Try Again
            </button>
          </div>
        )}

        <div className="orders-table-scroll">
          <table className="orders-table">
            <colgroup>
              <col className="orders-col-order" />
              <col className="orders-col-branch" />
              <col className="orders-col-date" />
              <col className="orders-col-type" />
              <col className="orders-col-items" />
              <col className="orders-col-total" />
              <col className="orders-col-status" />
              <col className="orders-col-actions" />
            </colgroup>

            <thead>
              <tr>
                <th scope="col">Customer Name</th>
                <th scope="col">Branch</th>
                <th scope="col">Date &amp; Time</th>
                <th scope="col">Type</th>
                <th scope="col">Items</th>
                <th scope="col">Total</th>
                <th scope="col">Status</th>
                <th scope="col" className="orders-actions-heading">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading || branchLoading ? (
                <tr>
                  <td colSpan={8} className="orders-state-cell">
                    <div className="orders-loading-state">
                      <LoaderCircle
                        size={25}
                        className="orders-spin"
                        aria-hidden="true"
                      />
                      <strong>
                        {branchLoading
                          ? "Loading branches"
                          : "Loading orders"}
                      </strong>
                      <span>
                        Please wait while we retrieve your orders.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : loadError || branchError ? (
                <tr>
                  <td colSpan={8} className="orders-state-cell">
                    <div className="orders-error-state">
                      <AlertCircle size={26} />
                      <strong>Unable to load orders</strong>
                      <p>{loadError || branchError}</p>
                      <button
                        type="button"
                        className="orders-secondary-button"
                        onClick={refreshOrders}
                      >
                        <RefreshCw size={14} />
                        Try Again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : !branchOptions.length ? (
                <tr>
                  <td colSpan={8} className="orders-state-cell">
                    <div className="orders-empty-state">
                      <strong>No branches available</strong>
                      <p>
                        Create or load a branch before managing restaurant
                        orders.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="orders-state-cell">
                    <div className="orders-empty-state">
                      <div className="orders-empty-icon">
                        <Receipt size={23} />
                      </div>
                      <strong>
                        {orders.length
                          ? "No matching orders"
                          : "No orders yet"}
                      </strong>
                      <p>
                        {orders.length
                          ? "Try another search term or adjust your filters."
                          : "Create an order to start tracking restaurant sales and preparation."}
                      </p>

                      {orders.length ? (
                        <button
                          type="button"
                          className="orders-secondary-button"
                          onClick={clearFilters}
                        >
                          Clear filters
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="orders-primary-button"
                          onClick={openAddForm}
                        >
                          <Plus size={16} />
                          New Order
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const TypeIcon = getTypeIcon(order.orderType);

                  const initials =
                    order.customer
                      .trim()
                      .split(/\s+/)
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "?";

                  return (
                    <tr key={`${order.branchId}-${order.id}`}>
                      <td>
                        <div className="orders-order-cell">
                          <div
                            className="orders-order-avatar"
                            aria-hidden="true"
                          >
                            {initials}
                          </div>

                          <div className="orders-order-copy">
                            <strong>{order.customer}</strong>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="orders-branch-name">
                          {branchNames.get(String(order.branchId)) ||
                            order.branchName ||
                            "Unknown Branch"}
                        </span>
                      </td>

                      <td>
                        <div className="orders-date-cell">
                          <strong>{formatDate(order.createdAt)}</strong>
                          <span>
                            <Clock3 size={12} />
                            {formatTime(order.createdAt)}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="orders-type-badge">
                          <TypeIcon size={13} />
                          {order.orderType}
                        </span>
                      </td>

                      <td>
                        <div className="orders-items-cell">
                          <strong>
                            {order.items.reduce(
                              (sum, item) =>
                                sum + Number(item.quantity || 0),
                              0
                            )}{" "}
                            item(s)
                          </strong>

                          <div className="orders-item-names">
                            {order.items.map((item, index) => (
                              <span
                                key={`${
                                  item.menuItemId || item.name
                                }-${index}`}
                              >
                                {item.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      <td>
                        <strong className="orders-total">
                          {formatCurrency(order.totalAmount)}
                        </strong>
                      </td>

                      {/* Read-only status: Kitchen Workflow manages updates. */}
                      <td>
                        <span
                          className={`orders-status-badge ${getStatusClass(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td>
                        <div className="orders-row-actions">
                          <button
                            type="button"
                            className="orders-action-button"
                            onClick={() => openEditForm(order)}
                            disabled={
                              order.status !== "Pending" ||
                              saving ||
                              deleting
                            }
                            aria-label={`Edit order ${order.id}`}
                            title={
                              order.status !== "Pending"
                                ? "Only pending orders can be edited"
                                : "Edit order"
                            }
                          >
                            <Pencil size={14} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            className="orders-action-button orders-delete-button"
                            onClick={() => setDeletingOrder(order)}
                            disabled={saving || deleting}
                            aria-label={`Delete order ${order.id}`}
                            title="Delete order"
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && !loading && !loadError && (
        <div className="orders-pagination">
          <span className="orders-pagination-info">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(
              currentPage * ITEMS_PER_PAGE,
              filteredOrders.length
            )}{" "}
            of {filteredOrders.length} orders
          </span>

          <div className="orders-pagination-buttons">
            <button
              type="button"
              className="orders-pagination-button"
              disabled={currentPage === 1}
              onClick={() =>
                setCurrentPage((page) => Math.max(1, page - 1))
              }
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            {paginationPages.map((page, index) =>
              page === "..." ? (
                <span
                  key={`ellipsis-${index}`}
                  className="orders-pagination-ellipsis"
                  aria-hidden="true"
                >
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  className={`orders-pagination-button ${
                    currentPage === page ? "active" : ""
                  }`}
                  onClick={() => setCurrentPage(page)}
                  aria-current={
                    currentPage === page ? "page" : undefined
                  }
                >
                  {page}
                </button>
              )
            )}

            <button
              type="button"
              className="orders-pagination-button"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((page) =>
                  Math.min(totalPages, page + 1)
                )
              }
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div
          className="orders-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            className="orders-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-modal-title"
          >
            <div className="orders-modal-heading">
              <div>
                <span className="orders-eyebrow">ORDER DETAILS</span>
                <h2 id="order-modal-title">
                  {editingId ? "Edit Order" : "New Order"}
                </h2>
                <p>
                  {editingId
                    ? "Update the details of this pending order."
                    : "Select a branch and add items to create an order."}
                </p>
              </div>

              <button
                type="button"
                className="orders-modal-close"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            {formError && (
              <div className="orders-form-error" role="alert">
                <AlertCircle size={17} />
                <span>{formError}</span>
              </div>
            )}

            <form className="orders-modal-form" onSubmit={handleSubmit}>
              <div className="orders-form-grid">
                <label className="orders-form-field">
                  <span>
                    Branch <b>*</b>
                  </span>
                  <select
                    name="branchId"
                    value={form.branchId}
                    onChange={handleFormChange}
                    required
                    disabled={saving || editingId !== null}
                  >
                    <option value="">Select branch</option>
                    {branchOptions.map((item) => {
                      const id = getId(item._id || item.id);

                      return (
                        <option key={id} value={id}>
                          {item.name || item.branchName || id}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label className="orders-form-field">
                  <span>
                    Customer name <b>*</b>
                  </span>
                  <input
                    name="customer"
                    value={form.customer}
                    onChange={handleFormChange}
                    placeholder="Enter customer name"
                    maxLength={120}
                    required
                    autoFocus
                    disabled={saving}
                  />
                </label>

                <label className="orders-form-field">
                  <span>
                    Order type <b>*</b>
                  </span>
                  <select
                    name="orderType"
                    value={form.orderType}
                    onChange={handleFormChange}
                    required
                    disabled={saving}
                  >
                    {ORDER_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                {form.orderType === "Dine-in" && (
                  <label className="orders-form-field">
                    <span>
                      Table <b>*</b>
                    </span>
                    <select
                      name="tableId"
                      value={form.tableId}
                      onChange={handleFormChange}
                      disabled={
                        saving ||
                        formDataLoading ||
                        !form.branchId
                      }
                      required
                    >
                      <option value="">
                        {!form.branchId
                          ? "Select a branch first"
                          : formDataLoading
                            ? "Loading tables..."
                            : availableTables.length
                              ? "Select table"
                              : "No available tables"}
                      </option>

                      {availableTables.map((table) => {
                        const id = getId(table._id || table.id);

                        return (
                          <option key={id} value={id}>
                            Table {table.number || id.slice(-4)}
                            {table.capacity != null
                              ? ` · Capacity ${table.capacity}`
                              : ""}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                )}
              </div>

              <div className="orders-items-section">
                <div className="orders-section-heading">
                  <div>
                    <h3>Order Items</h3>
                    <p>Add menu items and specify their quantities.</p>
                  </div>

                  <button
                    type="button"
                    className="orders-secondary-button orders-add-item-button"
                    onClick={addItem}
                    disabled={
                      saving ||
                      formDataLoading ||
                      !form.branchId ||
                      menuItems.length === 0
                    }
                  >
                    <Plus size={14} />
                    Add Item
                  </button>
                </div>

                {formDataLoading ? (
                  <div className="orders-form-loading">
                    <LoaderCircle
                      size={17}
                      className="orders-spin"
                    />
                    Loading menu items and tables...
                  </div>
                ) : !form.branchId ? (
                  <p className="orders-form-helper">
                    Select a branch to load its menu.
                  </p>
                ) : menuItems.length === 0 ? (
                  <p className="orders-form-helper">
                    No menu items are available for this branch.
                  </p>
                ) : (
                  <div className="orders-item-list">
                    {form.items.map((item, index) => {
                      const selectedMenuItem = menuItems.find(
                        (menu) =>
                          getId(menu._id || menu.id) ===
                          item.menuItemId
                      );

                      return (
                        <div
                          className="orders-item-row"
                          key={index}
                        >
                          <label className="orders-form-field orders-menu-field">
                            <span>
                              Menu item <b>*</b>
                            </span>
                            <select
                              value={item.menuItemId}
                              onChange={(event) =>
                                handleItemChange(
                                  index,
                                  "menuItemId",
                                  event.target.value
                                )
                              }
                              required
                              disabled={saving}
                            >
                              <option value="">
                                Select menu item
                              </option>
                              {menuItems.map((menu) => {
                                const id = getId(
                                  menu._id || menu.id
                                );

                                return (
                                  <option key={id} value={id}>
                                    {menu.name} —{" "}
                                    {formatCurrency(menu.price)}
                                  </option>
                                );
                              })}
                            </select>
                          </label>

                          <label className="orders-form-field orders-quantity-field">
                            <span>
                              Quantity <b>*</b>
                            </span>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={(event) =>
                                handleItemChange(
                                  index,
                                  "quantity",
                                  event.target.value
                                )
                              }
                              required
                              disabled={saving}
                            />
                          </label>

                          <div className="orders-item-subtotal">
                            <span>Subtotal</span>
                            <strong>
                              {formatCurrency(
                                Number(
                                  selectedMenuItem?.price || 0
                                ) * Number(item.quantity || 0)
                              )}
                            </strong>
                          </div>

                          <button
                            type="button"
                            className="orders-remove-item"
                            onClick={() => removeItem(index)}
                            disabled={
                              saving || form.items.length === 1
                            }
                            aria-label={`Remove item ${index + 1}`}
                            title="Remove item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="orders-form-total">
                  <span>Estimated Total</span>
                  <strong>{formatCurrency(estimatedTotal)}</strong>
                </div>
              </div>

              <label className="orders-form-field">
                <span>Order notes</span>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  placeholder="Special instructions or additional notes"
                  maxLength={1000}
                  rows={3}
                  disabled={saving}
                />
              </label>

              <div className="orders-modal-actions">
                <button
                  type="button"
                  className="orders-secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="orders-primary-button"
                  disabled={
                    saving ||
                    formDataLoading ||
                    !branchOptions.length
                  }
                >
                  {saving ? (
                    <>
                      <LoaderCircle
                        size={16}
                        className="orders-spin"
                      />
                      Saving...
                    </>
                  ) : editingId ? (
                    <>
                      <CheckCircle2 size={16} />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Create Order
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deletingOrder && (
        <div
          className="orders-modal-backdrop orders-confirm-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !deleting
            ) {
              setDeletingOrder(null);
            }
          }}
        >
          <section
            className="orders-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="order-delete-title"
            aria-describedby="order-delete-description"
          >
            <div className="orders-confirm-icon">
              <Trash2 size={23} aria-hidden="true" />
            </div>

            <h2 id="order-delete-title">Delete Order?</h2>

            <p id="order-delete-description">
              Delete order{" "}
              <strong>
                #{deletingOrder.id.slice(-8).toUpperCase()}
              </strong>{" "}
              for <strong>{deletingOrder.customer}</strong>? This
              action cannot be undone.
            </p>

            <div className="orders-confirm-actions">
              <button
                type="button"
                className="orders-secondary-button"
                onClick={() => setDeletingOrder(null)}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="orders-danger-button"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <LoaderCircle
                      size={16}
                      className="orders-spin"
                    />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Delete Order
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default Orders;