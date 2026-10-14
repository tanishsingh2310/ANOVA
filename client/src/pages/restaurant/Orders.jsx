import { useMemo, useState } from "react";
import "../../styles/orders.css";

const initialOrders = [
  {
    id: "ORD-1001",
    customer: "Aarav Shah",
    orderType: "Dine-in",
    table: "T-04",
    items: [
      { name: "Paneer Tikka", quantity: 2, price: 280 },
      { name: "Fresh Lime Soda", quantity: 2, price: 90 },
    ],
    status: "Preparing",
    createdAt: "2026-10-14T12:15:00",
    notes: "",
  },
  {
    id: "ORD-1002",
    customer: "Diya Patel",
    orderType: "Takeaway",
    table: "—",
    items: [
      { name: "Classic Margherita", quantity: 1, price: 320 },
      { name: "Chocolate Brownie", quantity: 1, price: 160 },
    ],
    status: "Ready",
    createdAt: "2026-10-14T12:25:00",
    notes: "Pack separately",
  },
  {
    id: "ORD-1003",
    customer: "Rohan Mehta",
    orderType: "Dine-in",
    table: "T-06",
    items: [
      { name: "Veg Biryani", quantity: 2, price: 260 },
      { name: "Dal Makhani", quantity: 1, price: 240 },
    ],
    status: "Pending",
    createdAt: "2026-10-14T12:40:00",
    notes: "",
  },
  {
    id: "ORD-1004",
    customer: "Ananya Desai",
    orderType: "Delivery",
    table: "—",
    items: [
      { name: "Paneer Tikka", quantity: 1, price: 280 },
      { name: "Veg Biryani", quantity: 1, price: 260 },
    ],
    status: "Completed",
    createdAt: "2026-10-14T11:30:00",
    notes: "Deliver to reception",
  },
  {
    id: "ORD-1005",
    customer: "Vivaan Joshi",
    orderType: "Dine-in",
    table: "T-02",
    items: [
      { name: "Dal Makhani", quantity: 1, price: 240 },
      { name: "Fresh Lime Soda", quantity: 2, price: 90 },
    ],
    status: "Cancelled",
    createdAt: "2026-10-14T11:50:00",
    notes: "",
  },
];

const menuItems = [
  { name: "Paneer Tikka", price: 280 },
  { name: "Classic Margherita", price: 320 },
  { name: "Dal Makhani", price: 240 },
  { name: "Veg Biryani", price: 260 },
  { name: "Chocolate Brownie", price: 160 },
  { name: "Fresh Lime Soda", price: 90 },
];

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
  orderType: "Dine-in",
  table: "T-01",
  items: [{ name: "Paneer Tikka", quantity: 1 }],
  status: "Pending",
  notes: "",
};

function getOrderTotal(items) {
  return items.reduce((total, item) => {
    const menuItem = menuItems.find(
      (menu) => menu.name === item.name
    );

    const price = menuItem?.price ?? item.price ?? 0;

    return total + price * Number(item.quantity);
  }, 0);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatOrderTime(dateString) {
  return new Date(dateString).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function Orders() {
  const [orders, setOrders] = useState(initialOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const summary = useMemo(
    () => ({
      total: orders.length,
      inProgress: orders.filter((order) =>
        ["Pending", "Preparing", "Ready"].includes(order.status)
      ).length,
      completed: orders.filter(
        (order) => order.status === "Completed"
      ).length,
      cancelled: orders.filter(
        (order) => order.status === "Cancelled"
      ).length,
    }),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders
      .filter((order) => {
        const matchesSearch =
          order.id.toLowerCase().includes(query) ||
          order.customer.toLowerCase().includes(query);

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

  function openAddModal() {
    setEditingId(null);
    setFormData({
      ...emptyForm,
      items: [{ name: "Paneer Tikka", quantity: 1 }],
    });
    setIsModalOpen(true);
  }

  function openEditModal(order) {
    setEditingId(order.id);
    setFormData({
      customer: order.customer,
      orderType: order.orderType,
      table: order.table === "—" ? "" : order.table,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
      })),
      status: order.status,
      notes: order.notes || "",
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleItemChange(index, field, value) {
    setFormData((previous) => ({
      ...previous,
      items: previous.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: field === "quantity" ? Number(value) : value,
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
        { name: menuItems[0].name, quantity: 1 },
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

  function handleSubmit(event) {
    event.preventDefault();

    if (!formData.customer.trim()) {
      window.alert("Please enter the customer's name.");
      return;
    }

    if (formData.orderType === "Dine-in" && !formData.table) {
      window.alert("Please select a table for a dine-in order.");
      return;
    }

    if (
      formData.items.length === 0 ||
      formData.items.some(
        (item) =>
          !item.name ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 99
      )
    ) {
      window.alert(
        "Add at least one food item and select a quantity between 1 and 99."
      );
      return;
    }

    const normalizedItems = formData.items.map((item) => {
      const menuItem = menuItems.find(
        (menu) => menu.name === item.name
      );

      return {
        ...item,
        price: menuItem.price,
      };
    });

    const orderData = {
      customer: formData.customer.trim(),
      orderType: formData.orderType,
      table: formData.orderType === "Dine-in" ? formData.table : "—",
      items: normalizedItems,
      status: formData.status,
      notes: formData.notes.trim(),
    };

    if (editingId !== null) {
      setOrders((previous) =>
        previous.map((order) =>
          order.id === editingId
            ? { ...order, ...orderData }
            : order
        )
      );
    } else {
      const nextNumber =
        Math.max(
          1000,
          ...orders.map((order) =>
            Number(order.id.replace("ORD-", "")) || 0
          )
        ) + 1;

      setOrders((previous) => [
        ...previous,
        {
          id: `ORD-${nextNumber}`,
          ...orderData,
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    closeModal();
  }

  function handleStatusChange(id, newStatus) {
    setOrders((previous) =>
      previous.map((order) =>
        order.id === id ? { ...order, status: newStatus } : order
      )
    );
  }

  function handleDelete(order) {
    const confirmed = window.confirm(
      `Delete order ${order.id} for ${order.customer}?`
    );

    if (!confirmed) return;

    setOrders((previous) =>
      previous.filter((item) => item.id !== order.id)
    );
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
          <span className="orders-eyebrow">RESTAURANT OPERATIONS</span>
          <h2>Orders Management</h2>
          <p>
            Track incoming orders, coordinate preparation, and keep
            service running smoothly.
          </p>
        </div>

        <button
          className="orders-primary-button"
          type="button"
          onClick={openAddModal}
        >
          <span aria-hidden="true">+</span> New Order
        </button>
      </div>

      <div className="orders-summary-grid">
        <SummaryCard
          icon="▤"
          label="Total Orders"
          value={summary.total}
          type="total"
        />
        <SummaryCard
          icon="◷"
          label="In Progress"
          value={summary.inProgress}
          type="progress"
        />
        <SummaryCard
          icon="✓"
          label="Completed"
          value={summary.completed}
          type="completed"
        />
        <SummaryCard
          icon="×"
          label="Cancelled"
          value={summary.cancelled}
          type="cancelled"
        />
      </div>

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

          {(searchTerm || statusFilter !== "All" || typeFilter !== "All") && (
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
                <th>CUSTOMER</th>
                <th>TYPE / TABLE</th>
                <th>ITEMS</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <div className="orders-id-details">
                      <strong>{order.id}</strong>
                      <span>{formatOrderTime(order.createdAt)}</span>
                    </div>
                  </td>

                  <td>
                    <div className="orders-customer-details">
                      <strong>{order.customer}</strong>
                      {order.notes && <span>{order.notes}</span>}
                    </div>
                  </td>

                  <td>
                    <div className="orders-type-details">
                      <strong>{order.orderType}</strong>
                      {order.orderType === "Dine-in" && (
                        <span>{order.table}</span>
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
                      {formatCurrency(getOrderTotal(order.items))}
                    </strong>
                  </td>

                  <td>
                    <select
                      className={`orders-status-select ${order.status
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                      value={order.status}
                      onChange={(event) =>
                        handleStatusChange(order.id, event.target.value)
                      }
                      aria-label={`Change status for ${order.id}`}
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
                      <button
                        className="orders-action-button"
                        type="button"
                        onClick={() => openEditModal(order)}
                        aria-label={`Edit ${order.id}`}
                      >
                        Edit
                      </button>
                      <button
                        className="orders-action-button delete"
                        type="button"
                        onClick={() => handleDelete(order)}
                        aria-label={`Delete ${order.id}`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="7">
                    <div className="orders-empty-state">
                      <span aria-hidden="true">▤</span>
                      <h3>No orders found</h3>
                      <p>
                        Adjust your filters or create a new restaurant
                        order.
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
                <p>Enter customer details and select the required items.</p>
              </div>

              <button
                className="orders-modal-close"
                type="button"
                onClick={closeModal}
                aria-label="Close order form"
              >
                ×
              </button>
            </div>

            <form className="orders-modal-form" onSubmit={handleSubmit}>
              <div className="orders-form-group">
                <label htmlFor="order-customer">Customer name *</label>
                <input
                  id="order-customer"
                  name="customer"
                  type="text"
                  value={formData.customer}
                  onChange={handleInputChange}
                  placeholder="Enter customer name"
                  maxLength={80}
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
                      name="table"
                      value={formData.table}
                      onChange={handleInputChange}
                      required
                    >
                      {Array.from({ length: 12 }, (_, index) => {
                        const table = `T-${String(index + 1).padStart(2, "0")}`;

                        return (
                          <option key={table} value={table}>
                            {table}
                          </option>
                        );
                      })}
                    </select>
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
                        value={item.name}
                        onChange={(event) =>
                          handleItemChange(index, "name", event.target.value)
                        }
                      >
                        {menuItems.map((menuItem) => (
                          <option key={menuItem.name} value={menuItem.name}>
                            {menuItem.name} — {formatCurrency(menuItem.price)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="orders-form-group orders-quantity-group">
                      <label htmlFor={`item-quantity-${index}`}>Qty.</label>
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
                      disabled={formData.items.length === 1}
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
                  <label htmlFor="order-notes">Special instructions</label>
                  <input
                    id="order-notes"
                    name="notes"
                    type="text"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Optional notes"
                    maxLength={200}
                  />
                </div>
              </div>

              <div className="orders-total-preview">
                <span>Order total</span>
                <strong>
                  {formatCurrency(
                    getOrderTotal(
                      formData.items.map((item) => ({
                        ...item,
                        price:
                          menuItems.find(
                            (menuItem) => menuItem.name === item.name
                          )?.price ?? 0,
                      }))
                    )
                  )}
                </strong>
              </div>

              <div className="orders-modal-actions">
                <button
                  className="orders-secondary-button"
                  type="button"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button className="orders-primary-button" type="submit">
                  {editingId ? "Save Changes" : "Create Order"}
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