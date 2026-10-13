import { useMemo, useState } from "react";
import "../../styles/menu-management.css";

const initialMenu = [
  {
    id: 1,
    name: "Paneer Tikka",
    category: "Starters",
    description: "Char-grilled paneer marinated with aromatic Indian spices.",
    price: 280,
    available: true,
  },
  {
    id: 2,
    name: "Classic Margherita",
    category: "Pizza",
    description: "Tomato sauce, mozzarella, and fresh basil.",
    price: 320,
    available: true,
  },
  {
    id: 3,
    name: "Dal Makhani",
    category: "Main Course",
    description: "Slow-cooked black lentils finished with cream and butter.",
    price: 260,
    available: true,
  },
  {
    id: 4,
    name: "Veg Biryani",
    category: "Main Course",
    description: "Fragrant basmati rice cooked with vegetables and spices.",
    price: 240,
    available: false,
  },
  {
    id: 5,
    name: "Chocolate Brownie",
    category: "Desserts",
    description: "Rich chocolate brownie served as a classic dessert.",
    price: 160,
    available: true,
  },
  {
    id: 6,
    name: "Fresh Lime Soda",
    category: "Beverages",
    description: "Refreshing lime soda, available sweet or salted.",
    price: 90,
    available: true,
  },
];

const emptyForm = {
  name: "",
  category: "Starters",
  description: "",
  price: "",
};

const categories = [
  "Starters",
  "Main Course",
  "Pizza",
  "Desserts",
  "Beverages",
];

function MenuManagement() {
  const [menu, setMenu] = useState(initialMenu);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [availabilityFilter, setAvailabilityFilter] = useState("All Items");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const filteredMenu = useMemo(() => {
    return menu.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === "All Categories" ||
        item.category === categoryFilter;

      const matchesAvailability =
        availabilityFilter === "All Items" ||
        (availabilityFilter === "Available" && item.available) ||
        (availabilityFilter === "Unavailable" && !item.available);

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [menu, search, categoryFilter, availabilityFilter]);

  const availableCount = menu.filter((item) => item.available).length;
  const unavailableCount = menu.length - availableCount;

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(item) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      description: item.description,
      price: String(item.price),
    });
    setShowForm(true);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const name = form.name.trim();
    const description = form.description.trim();
    const price = Number(form.price);

    if (!name || !description || form.price === "" || !Number.isFinite(price) || price <= 0) {
      window.alert("Please enter valid menu details and a price greater than zero.");
      return;
    }

    const menuItem = {
      id: editingId ?? Date.now(),
      name,
      category: form.category,
      description,
      price,
      available: editingId
        ? menu.find((item) => item.id === editingId).available
        : true,
    };

    if (editingId !== null) {
      setMenu((current) =>
        current.map((item) => (item.id === editingId ? menuItem : item))
      );
    } else {
      setMenu((current) => [menuItem, ...current]);
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function toggleAvailability(id) {
    setMenu((current) =>
      current.map((item) =>
        item.id === id ? { ...item, available: !item.available } : item
      )
    );
  }

  function deleteMenuItem(id) {
    const item = menu.find((entry) => entry.id === id);

    if (!item) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}"?`
    );

    if (confirmed) {
      setMenu((current) => current.filter((entry) => entry.id !== id));
    }
  }

  return (
    <section className="menu-management">
      <div className="menu-page-heading">
        <div>
          <span className="menu-eyebrow">RESTAURANT OPERATIONS</span>
          <h1>Menu Management</h1>
          <p>
            Manage your dishes, pricing, categories, and menu availability.
          </p>
        </div>

        <button className="menu-primary-button" onClick={openAddForm}>
          <span aria-hidden="true">+</span> Add Menu Item
        </button>
      </div>

      <div className="menu-summary-grid">
        <article className="menu-summary-card">
          <span className="menu-summary-label">Total Menu Items</span>
          <strong>{menu.length}</strong>
          <span className="menu-summary-note">Across all categories</span>
        </article>

        <article className="menu-summary-card">
          <span className="menu-summary-label">Available Items</span>
          <strong>{availableCount}</strong>
          <span className="menu-summary-note">Currently on the menu</span>
        </article>

        <article className="menu-summary-card">
          <span className="menu-summary-label">Unavailable Items</span>
          <strong>{unavailableCount}</strong>
          <span className="menu-summary-note">Temporarily not orderable</span>
        </article>
      </div>

      <div className="menu-toolbar">
        <div className="menu-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search dishes or descriptions..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search menu"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Filter by category"
        >
          <option>All Categories</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>

        <select
          value={availabilityFilter}
          onChange={(event) => setAvailabilityFilter(event.target.value)}
          aria-label="Filter by availability"
        >
          <option>All Items</option>
          <option>Available</option>
          <option>Unavailable</option>
        </select>
      </div>

      <div className="menu-table-container">
        <div className="menu-table-heading">
          <div>
            <h2>Restaurant Menu</h2>
            <p>{filteredMenu.length} items found</p>
          </div>
        </div>

        <div className="menu-table-scroll">
          <table className="menu-table">
            <thead>
              <tr>
                <th>Menu Item</th>
                <th>Category</th>
                <th>Price</th>
                <th>Availability</th>
                <th className="menu-actions-heading">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredMenu.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="menu-item-name">{item.name}</div>
                    <div className="menu-item-description">
                      {item.description}
                    </div>
                  </td>

                  <td>
                    <span className="menu-category-badge">
                      {item.category}
                    </span>
                  </td>

                  <td className="menu-price">
                    ₹{item.price.toLocaleString("en-IN")}
                  </td>

                  <td>
                    <span
                      className={`menu-status ${
                        item.available ? "is-available" : "is-unavailable"
                      }`}
                    >
                      <span className="menu-status-dot"></span>
                      {item.available ? "Available" : "Unavailable"}
                    </span>
                  </td>

                  <td>
                    <div className="menu-row-actions">
                      <button
                        className="menu-action-button"
                        onClick={() => openEditForm(item)}
                        aria-label={`Edit ${item.name}`}
                      >
                        Edit
                      </button>

                      <button
                        className="menu-action-button menu-toggle-button"
                        onClick={() => toggleAvailability(item.id)}
                      >
                        {item.available ? "Disable" : "Enable"}
                      </button>

                      <button
                        className="menu-action-button menu-delete-button"
                        onClick={() => deleteMenuItem(item.id)}
                        aria-label={`Delete ${item.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredMenu.length === 0 && (
                <tr>
                  <td colSpan="5" className="menu-empty-state">
                    <strong>No menu items found</strong>
                    <p>Try changing your search or filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div
          className="menu-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowForm(false);
            }
          }}
        >
          <section
            className="menu-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-modal-title"
          >
            <div className="menu-modal-heading">
              <div>
                <span className="menu-eyebrow">MENU CONFIGURATION</span>
                <h2 id="menu-modal-title">
                  {editingId !== null ? "Edit Menu Item" : "Add Menu Item"}
                </h2>
              </div>

              <button
                type="button"
                className="menu-modal-close"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>
                Dish Name
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="e.g. Paneer Tikka"
                  required
                  maxLength={100}
                />
              </label>

              <label>
                Category
                <select
                  name="category"
                  value={form.category}
                  onChange={handleFormChange}
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label>
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Describe the dish..."
                  rows={3}
                  required
                  maxLength={500}
                />
              </label>

              <label>
                Price (₹)
                <input
                  name="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.price}
                  onChange={handleFormChange}
                  placeholder="e.g. 280"
                  required
                />
              </label>

              <div className="menu-modal-actions">
                <button
                  type="button"
                  className="menu-secondary-button"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="menu-primary-button">
                  {editingId !== null ? "Save Changes" : "Add Menu Item"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

export default MenuManagement;