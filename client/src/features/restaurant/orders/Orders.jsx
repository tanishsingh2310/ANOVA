import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../../services/api";
import "../../../styles/orders.css";



const orderStatuses = [
  "Pending",
  "Preparing",
  "Ready",
  "Completed",
  "Cancelled",
];

const orderTypes = ["Dine-in", "Takeaway", "Delivery"];

const emptyForm = {
  customer: "",
  branchId: "",
  orderType: "Dine-in",
  tableId: "",
  items: [{ menuItemId: "", quantity: 1 }],
  status: "Pending",
  notes: "",
};

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function formatOrderTime(dateString) {
  if (!dateString) return "—";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getOrderTotal(items = []) {
  return items.reduce(
    (total, item) =>
      total + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  );
}

function getOrderId(order) {
  return order.orderNumber || order.id || order._id;
}

function Orders({
  branchId,
  branches = [],
  onBranchChange,
  branchLoading = false,
  branchError = "",
}) {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");

    const loadData = useCallback(async () => {
  setIsLoading(true);
  setPageError("");
  setOrders([]);
  setMenuItems([]);
  setTables([]);

  try {
    let ordersData = [];
    let menuData = [];
    let tablesData = [];

    if (branchId === "all") {
      if (branches.length === 0) {
        setOrders([]);
        return;
      }

      const branchOrders = await Promise.all(
        branches.map(async (branch) => {
          const data = await apiRequest(`/api/orders/${branch._id}`);

          if (!Array.isArray(data)) {
            throw new Error(
              `Invalid orders response for ${branch.name}.`
            );
          }

          return data.map((order) => ({
            ...order,
            id: order._id,
            branchId:
              typeof order.branchId === "object"
                ? order.branchId?._id || branch._id
                : order.branchId || branch._id,
            branchName:
              typeof order.branchId === "object"
                ? order.branchId?.name || branch.name
                : branch.name,
            items: (order.items || []).map((item) => ({
              ...item,
              menuItemId: String(
                typeof item.menuItemId === "object"
                  ? item.menuItemId?._id
                  : item.menuItemId
              ),
              price: Number(item.price) || 0,
              quantity: Number(item.quantity) || 1,
            })),
          }));
        })
      );

      ordersData = branchOrders.flat();
    } else if (branchId) {
      const [branchOrders, branchMenu, branchTables] =
        await Promise.all([
          apiRequest(`/api/orders/${branchId}`),
          apiRequest(`/api/menu/${branchId}`),
          apiRequest(`/api/tables/${branchId}`),
        ]);

      if (
        !Array.isArray(branchOrders) ||
        !Array.isArray(branchMenu) ||
        !Array.isArray(branchTables)
      ) {
        throw new Error("The server returned an unexpected response.");
      }

      const selectedBranch = branches.find(
        (branch) => String(branch._id) === String(branchId)
      );

      ordersData = branchOrders.map((order) => ({
        ...order,
        id: order._id,
        branchId:
          typeof order.branchId === "object"
            ? order.branchId?._id || branchId
            : order.branchId || branchId,
        branchName:
          typeof order.branchId === "object"
            ? order.branchId?.name || selectedBranch?.name || "—"
            : selectedBranch?.name || "—",
        items: (order.items || []).map((item) => ({
          ...item,
          menuItemId: String(
            typeof item.menuItemId === "object"
              ? item.menuItemId?._id
              : item.menuItemId
          ),
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
        })),
      }));

      menuData = branchMenu;
      tablesData = branchTables;
    }

    setOrders(ordersData);

    setMenuItems(
      menuData
        .filter((item) => item.available)
        .map((item) => ({
          ...item,
          id: String(item._id),
          price: Number(item.price),
        }))
    );

    setTables(
      tablesData.map((table) => ({
        ...table,
        id: String(table._id),
      }))
    );
  } catch (error) {
    setPageError(
      error.message ||
        "Unable to load orders. Please check that the backend is running."
    );
  } finally {
    setIsLoading(false);
  }
}, [branchId, branches]);

  useEffect(() => {
    loadData();
  }, [loadData]);
useEffect(() => {
  if (!isModalOpen) return;

  const selectedFormBranch = formData.branchId;

  if (!selectedFormBranch) {
    setMenuItems([]);
    setTables([]);
    return;
  }

  let cancelled = false;

  async function loadBranchFormData() {
    setFormError("");

    try {
      const [menuData, tablesData] = await Promise.all([
        apiRequest(`/api/menu/${selectedFormBranch}`),
        apiRequest(`/api/tables/${selectedFormBranch}`),
      ]);

      if (!Array.isArray(menuData) || !Array.isArray(tablesData)) {
        throw new Error(
          "Unable to load menu items and tables for this branch."
        );
      }

      if (cancelled) return;

      setMenuItems(
        menuData
          .filter((item) => item.available)
          .map((item) => ({
            ...item,
            id: String(item._id),
            price: Number(item.price) || 0,
          }))
      );

      setTables(
        tablesData.map((table) => ({
          ...table,
          id: String(table._id),
        }))
      );
    } catch (error) {
      if (cancelled) return;

      setMenuItems([]);
      setTables([]);

      setFormError(
        error.message ||
          "Unable to load menu items and tables for this branch."
      );
    }
  }

  loadBranchFormData();

  return () => {
    cancelled = true;
  };
}, [isModalOpen, formData.branchId]);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders
      .filter((order) => {
        const orderId = String(getOrderId(order) || "").toLowerCase();
        const customer = String(order.customer || "").toLowerCase();

        const matchesSearch =
          orderId.includes(query) || customer.includes(query);

        const matchesStatus =
          statusFilter === "All" || order.status === statusFilter;

        const matchesType =
          typeFilter === "All" || order.orderType === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );
  }, [orders, searchTerm, statusFilter, typeFilter]);

  const availableTables = useMemo(
    () =>
      tables.filter(
        (table) =>
          table.status === "Available" ||
          String(table._id) === String(formData.tableId)
      ),
    [tables, formData.tableId]
  );

  function openAddModal() {
  setEditingId(null);
  setFormError("");

  setFormData({
    ...emptyForm,
    branchId: branchId && branchId !== "all" ? branchId : "",
    tableId: "",
    items: [{ menuItemId: "", quantity: 1 }],
  });

  setIsModalOpen(true);
}

 function openEditModal(order) {
  const orderStatus = String(order.status || "").toLowerCase();

  // Only pending orders can be edited.
  if (orderStatus !== "pending") {
    setFormError(
      "This order cannot be edited because kitchen preparation has started."
    );
    return;
  }

  setEditingId(order._id);
  setFormError("");

  setFormData({
    customer: order.customer || "",
    branchId:
  typeof order.branchId === "object"
    ? order.branchId?._id || ""
    : order.branchId || "",
    orderType: order.orderType,
    tableId: order.tableId ? String(order.tableId) : "",
    items: (order.items || []).map((item) => ({
      menuItemId: String(item.menuItemId),
      quantity: item.quantity,
    })),
    status: order.status,
    notes: order.notes || "",
  });

  setIsModalOpen(true);
}

  function closeModal() {
    if (isSaving) return;

    setIsModalOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
    setFormError("");
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "orderType" && value !== "Dine-in"
        ? { tableId: "" }
        : {}),
    }));
  }

  function handleItemChange(index, field, value) {
    setFormData((previous) => ({
      ...previous,
      items: previous.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]:
                field === "quantity" ? Number(value) : value,
            }
          : item
      ),
    }));
  }

  function addItemRow() {
    setFormData((previous) => ({
      ...previous,
      items: [
        ...previous.items,
        {
          menuItemId: menuItems[0]?.id || "",
          quantity: 1,
        },
      ],
    }));
  }

  function removeItemRow(index) {
    setFormData((previous) => ({
      ...previous,
      items: previous.items.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  }

  function getFormTotal() {
    return formData.items.reduce((total, item) => {
      const menuItem = menuItems.find(
        (menu) => menu.id === item.menuItemId
      );

      return (
        total +
        (Number(menuItem?.price) || 0) *
          (Number(item.quantity) || 0)
      );
    }, 0);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (!formData.customer.trim()) {
      setFormError("Please enter the customer's name.");
      return;
    }

    if (formData.customer.trim().length > 100) {
      setFormError("Customer name cannot exceed 100 characters.");
      return;
    }

    if (formData.orderType === "Dine-in" && !formData.tableId) {
      setFormError("Please select an available table.");
      return;
    }

    if (
      formData.items.length === 0 ||
      formData.items.some(
        (item) =>
          !item.menuItemId ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 99
      )
    ) {
      setFormError(
        "Select at least one menu item and a quantity between 1 and 99."
      );
      return;
    }

    if (
      formData.items.some(
        (item) =>
          !menuItems.some((menu) => menu.id === item.menuItemId)
      )
    ) {
      setFormError(
        "One or more selected menu items are no longer available. Refresh the page and try again."
      );
      return;
    }

    if (formData.notes.length > 500) {
      setFormError("Special instructions cannot exceed 500 characters.");
      return;
    }

    const payload = {
      branchId: branchId,
      customer: formData.customer.trim(),
      orderType: formData.orderType,
      tableId:
        formData.orderType === "Dine-in" ? formData.tableId : null,
      items: formData.items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
      })),
      status: formData.status,
      notes: formData.notes.trim(),
    };

    setIsSaving(true);

    try {
      if (editingId) {
        await apiRequest(
          `/api/orders/${branchId}/${editingId}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
      } else {
        await apiRequest("/api/orders", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData(emptyForm);

      await loadData();
    } catch (error) {
      setFormError(
        error.message || "Unable to save the order. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(id, newStatus) {
    const previousOrders = orders;

    setPageError("");

    setOrders((previous) =>
      previous.map((order) =>
        order._id === id ? { ...order, status: newStatus } : order
      )
    );

    try {
      await apiRequest(`/api/orders/${branchId}/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });

      await loadData();
    } catch (error) {
      setOrders(previousOrders);
      setPageError(
        error.message || "Unable to update the order status."
      );
    }
  }

  async function handleDelete(order) {
    const orderNumber = getOrderId(order);

    const confirmed = window.confirm(
      `Delete order ${orderNumber} for ${order.customer}?`
    );

    if (!confirmed) return;

    setPageError("");

    try {
      await apiRequest(
        `/api/orders/${branchId}/${order._id}`,
        { method: "DELETE" }
      );

      setOrders((previous) =>
        previous.filter((item) => item._id !== order._id)
      );
    } catch (error) {
      setPageError(
        error.message || "Unable to delete the order."
      );
    }
  }

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("All");
    setTypeFilter("All");
  }

  return (
    <section className="orders-page">
      <div className="orders-page-header">
        <div>
          
          <p>
            Track incoming orders, coordinate preparation, and keep
            service running smoothly.
          </p>
        </div>

        <button
          className="orders-primary-button"
          type="button"
          onClick={openAddModal}
          disabled={isLoading || menuItems.length === 0}
          title={
            menuItems.length === 0
              ? "Add available menu items before creating an order"
              : ""
          }
        >
          <span aria-hidden="true">+</span> New Order
        </button>
      </div>

      {pageError && (
        <div className="orders-error-message" role="alert">
          <span>{pageError}</span>
          <button type="button" onClick={loadData}>
            Retry
          </button>
        </div>
      )}

      

      <div className="orders-content-panel">
        <div className="orders-content-header">
          <div>
            <h3>Restaurant Orders</h3>
            <p>Review order details and update their progress.</p>
          </div>

          <span className="orders-count">
            {filteredOrders.length}{" "}
            {filteredOrders.length === 1 ? "order" : "orders"}
          </span>
        </div>

        <div className="orders-toolbar">
          <div className="orders-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search order ID or customer..."
              aria-label="Search orders"
            />
          </div>
          <div className="orders-branch-filter">
  <label htmlFor="orders-branch-filter">BRANCH</label>
  <select
    id="orders-branch-filter"
    value={branchId || "all"}
    onChange={(event) => onBranchChange?.(event.target.value)}
    disabled={branchLoading}
  >
    <option value="all">All Branches</option>
    {branches.map((branch) => (
      <option key={branch._id} value={branch._id}>
        {branch.name}
      </option>
    ))}
  </select>
</div>
          <select
            className="orders-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by order status"
          >
            <option value="All">All statuses</option>
            {orderStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            className="orders-filter"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            aria-label="Filter by order type"
          >
            <option value="All">All order types</option>
            {orderTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {(searchTerm ||
            statusFilter !== "All" ||
            typeFilter !== "All") && (
            <button
              className="orders-clear-button"
              type="button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="orders-table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>ORDER</th>
                <th>Branch</th>
                <th>CUSTOMER</th>
                <th>TYPE / TABLE</th>
                <th>ITEMS</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7">
                    <div className="orders-empty-state">
                      <h3>Loading orders...</h3>
                      <p>Retrieving orders from the database.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.map((order) => (
                <tr key={order._id}>
                  <td>
                    <div className="orders-id-details">
                      <strong>{getOrderId(order)}</strong>
                      <span>{formatOrderTime(order.createdAt)}</span>
                    </div>
                  </td>
                  <td>
  <span className="orders-branch-name">
    {order.branchName ||
      branches.find(
        (branch) =>
          String(branch._id) ===
          String(
            typeof order.branchId === "object"
              ? order.branchId?._id
              : order.branchId || ""
          )
      )?.name ||
      "—"}
  </span>
</td>

                  <td>
  <div className="orders-customer-details">
    <strong>{order.customer}</strong>

    {order.notes?.trim() && (
      <div className="orders-special-instructions">
        <span className="orders-special-instructions-label">
          <span aria-hidden="true">✦</span>
          Customer Demand
        </span>

        <p>{order.notes}</p>
      </div>
    )}
  </div>
</td>

                  <td>
                    <div className="orders-type-details">
                      <strong>{order.orderType}</strong>
                      {order.orderType === "Dine-in" && (
                        <span>{order.table || "—"}</span>
                      )}
                    </div>
                  </td>

                  <td>
                    <div className="orders-item-details">
                      <strong>
                        {order.items.reduce(
                          (total, item) => total + item.quantity,
                          0
                        )}{" "}
                        items
                      </strong>
                      <span>
                        {order.items
                          .map((item) => item.name)
                          .join(", ")}
                      </span>
                    </div>
                  </td>

                  <td>
                    <strong className="orders-amount">
                      {formatCurrency(order.totalAmount)}
                    </strong>
                  </td>

                  <td>
                    <select
                      className={`orders-status-select ${order.status
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                      value={order.status}
                      onChange={(event) =>
                        handleStatusChange(
                          order._id,
                          event.target.value
                        )
                      }
                      aria-label={`Change status for ${getOrderId(order)}`}
                    >
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                  <div className="orders-actions">
                    {String(order.status || "").toLowerCase() === "pending" && (
                      <button
                        className="orders-action-button"
                        type="button"
                        onClick={() => openEditModal(order)}
                        aria-label={`Edit ${getOrderId(order)}`}
                      >
                      Edit
                      </button>
                    )}

                       <button
                        className="orders-action-button delete"
                        type="button"
                        onClick={() => handleDelete(order)}
                        aria-label={`Delete ${getOrderId(order)}`}
                       >
                       Delete
                      </button>
                  </div>
                  </td>
                </tr>
              ))}

              {!isLoading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="7">
                    <div className="orders-empty-state">
                      <span aria-hidden="true">▤</span>
                      <h3>No orders found</h3>
                      <p>
                        {orders.length === 0
                          ? "Create your first order to get started."
                          : "Adjust your filters or create a new restaurant order."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div
          className="orders-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="orders-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="orders-modal-title"
          >
            <div className="orders-modal-header">
              <div>
                <span className="orders-eyebrow">ORDER DETAILS</span>
                <h3 id="orders-modal-title">
                  {editingId ? "Edit Order" : "Create New Order"}
                </h3>
                <p>
                  Enter customer details and select the required items.
                </p>
              </div>

              <button
                className="orders-modal-close"
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                aria-label="Close order form"
              >
                ×
              </button>
            </div>

            <form className="orders-modal-form" onSubmit={handleSubmit}>
              <div className="orders-form-group orders-branch-form-group">
  <label htmlFor="order-branch">Branch *</label>
  <select
    id="order-branch"
    name="branchId"
    value={formData.branchId || ""}
    onChange={(event) => {
      const nextBranchId = event.target.value;

      setFormData((previous) => ({
        ...previous,
        branchId: nextBranchId,
        tableId: "",
        items: [{ menuItemId: "", quantity: 1 }],
      }));

      setFormError("");
    }}
    required
    disabled={Boolean(editingId)}
  >
    <option value="">Select a branch</option>
    {branches.map((branch) => (
      <option key={branch._id} value={branch._id}>
        {branch.name}
      </option>
    ))}
  </select>
</div>
              <div className="orders-form-group">
                <label htmlFor="order-customer">Customer name *</label>
                <input
                  id="order-customer"
                  name="customer"
                  type="text"
                  value={formData.customer}
                  onChange={handleInputChange}
                  placeholder="Enter customer name"
                  maxLength={100}
                  required
                />
              </div>

              <div className="orders-form-row">
                <div className="orders-form-group">
                  <label htmlFor="order-type">Order type *</label>
                  <select
                    id="order-type"
                    name="orderType"
                    value={formData.orderType}
                    onChange={handleInputChange}
                  >
                    {orderTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.orderType === "Dine-in" && (
                  <div className="orders-form-group">
                    <label htmlFor="order-table">Table *</label>
                    <select
                      id="order-table"
                      name="tableId"
                      value={formData.tableId}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select a table</option>

                      {availableTables.map((table) => (
                        <option key={table.id} value={table.id}>
                          {table.number} — {table.status}
                        </option>
                      ))}
                    </select>

                    {availableTables.length === 0 && (
                      <small>No available tables found.</small>
                    )}
                  </div>
                )}
              </div>

              <div className="orders-items-heading">
                <div>
                  <h4>Order items</h4>
                  <p>Select menu items and quantities.</p>
                </div>

                <button
                  className="orders-add-item-button"
                  type="button"
                  onClick={addItemRow}
                  disabled={menuItems.length === 0 || isSaving}
                >
                  + Add item
                </button>
              </div>

              <div className="orders-form-items">
                {formData.items.map((item, index) => (
                  <div className="orders-form-item-row" key={index}>
                    <div className="orders-form-group">
                      <label htmlFor={`item-name-${index}`}>
                        Food item {index + 1}
                      </label>

                      <select
                        id={`item-name-${index}`}
                        value={item.menuItemId}
                        onChange={(event) =>
                          handleItemChange(
                            index,
                            "menuItemId",
                            event.target.value
                          )
                        }
                        required
                      >
                        <option value="">Select a menu item</option>

                        {menuItems.map((menuItem) => (
                          <option
                            key={menuItem.id}
                            value={menuItem.id}
                          >
                            {menuItem.name} —{" "}
                            {formatCurrency(menuItem.price)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="orders-form-group orders-quantity-group">
                      <label htmlFor={`item-quantity-${index}`}>
                        Qty.
                      </label>

                      <input
                        id={`item-quantity-${index}`}
                        type="number"
                        min="1"
                        max="99"
                        value={item.quantity}
                        onChange={(event) =>
                          handleItemChange(
                            index,
                            "quantity",
                            event.target.value
                          )
                        }
                        required
                      />
                    </div>

                    <button
                      className="orders-remove-item-button"
                      type="button"
                      onClick={() => removeItemRow(index)}
                      disabled={formData.items.length === 1 || isSaving}
                      aria-label={`Remove food item ${index + 1}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="orders-form-row">
                <div className="orders-form-group">
                  <label htmlFor="order-status">Order status</label>
                  <select
                    id="order-status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    {orderStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="orders-form-group">
                  <label htmlFor="order-notes">
                    Special instructions
                  </label>
                  <input
                    id="order-notes"
                    name="notes"
                    type="text"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Optional notes"
                    maxLength={500}
                  />
                </div>
              </div>

              <div className="orders-total-preview">
                <span>Order total</span>
                <strong>{formatCurrency(getFormTotal())}</strong>
              </div>

              {formError && (
                <div className="orders-error-message" role="alert">
                  {formError}
                </div>
              )}

              <div className="orders-modal-actions">
                <button
                  className="orders-secondary-button"
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                >
                  Cancel
                </button>

                <button
                  className="orders-primary-button"
                  type="submit"
                  disabled={isSaving || menuItems.length === 0}
                >
                  {isSaving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Create Order"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

function SummaryCard({ icon, label, value, type }) {
  return (
    <div className="orders-summary-card">
      <div className={`orders-summary-icon ${type}`}>{icon}</div>

      <div className="orders-summary-info">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export default Orders;