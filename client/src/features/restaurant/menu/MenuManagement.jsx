import { useEffect, useMemo, useState } from "react";
import "../../../styles/menu-management.css";
import { apiRequest } from "../../../services/api";



const emptyForm = {
  name: "",
  category: "Starters",
  description: "",
  price: "",
  dietary: "Vegetarian",
  spice: "Medium",
  ingredients: "",
};

const categories = [
  "Starters",
  "Main Course",
  "Pizza",
  "Desserts",
  "Beverages",
];

function MenuManagement({
  branchId,
  branches,
  onBranchChange,
  branchLoading,
  branchError,
}) {
  const [menu, setMenu] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [availabilityFilter, setAvailabilityFilter] = useState("All Items");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  // Convert MongoDB documents to the format used by the existing UI.
  function normalizeMenuItem(item) {
    return {
      ...item,
      id: item._id,
    };
  }

  // Load menu items from the backend when the page opens.
  // Load menu items whenever the selected branch changes.
useEffect(() => {
  let isMounted = true;

  async function loadMenu() {
    if (!branchId) {
      setMenu([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMenu([]);

    try {
      const data = await apiRequest(`/api/menu/${branchId}`);

      if (isMounted) {
        setMenu(data.map(normalizeMenuItem));
      }
    } catch (error) {
      if (isMounted) {
        window.alert(`Unable to load menu items: ${error.message}`);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }

  loadMenu();

  return () => {
    isMounted = false;
  };
}, [branchId]);

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
    dietary: item.dietary || "Vegetarian",
    spice: item.spice || "Medium",
    ingredients: Array.isArray(item.ingredients)
      ? item.ingredients.join(", ")
      : "",
  });

  setShowForm(true);
}

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const name = form.name.trim();
    const description = form.description.trim();
    const price = Number(form.price);

    if (
      !name ||
      !description ||
      form.price === "" ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      window.alert(
        "Please enter valid menu details and a price greater than zero."
      );
      return;
    }

    const existingItem =
      editingId !== null
        ? menu.find((item) => item.id === editingId)
        : null;

    if (editingId !== null && !existingItem) {
      window.alert("The menu item could not be found.");
      return;
    }

    const menuItemData = {
  name,
  category: form.category,
  description,
  price,
  dietary: form.dietary,
  spice: form.spice,
  ingredients: form.ingredients
    .split(",")
    .map((ingredient) => ingredient.trim())
    .filter(Boolean),
};

    try {
      if (editingId !== null) {
        // Update the existing item in MongoDB.
        const updatedItem = await apiRequest(
          `/api/menu/${branchId}/${editingId}`,
          {
            method: "PUT",
            body: JSON.stringify(menuItemData),
          }
        );

        setMenu((current) =>
          current.map((item) =>
            item.id === editingId
              ? normalizeMenuItem(updatedItem)
              : item
          )
        );

        window.alert("Menu item updated successfully.");
      } else {
        // Create a new item in MongoDB.
        const createdItem = await apiRequest("/api/menu", {
          method: "POST",
          body: JSON.stringify({
            branchId: branchId,
            ...menuItemData,
            available: true,
          }),
        });

        setMenu((current) => [
          normalizeMenuItem(createdItem),
          ...current,
        ]);

        window.alert("Menu item added successfully.");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (error) {
      window.alert(`Unable to save menu item: ${error.message}`);
    }
  }

  async function toggleAvailability(id) {
    const item = menu.find((entry) => entry.id === id);

    if (!item) {
      return;
    }

    try {
      const updatedItem = await apiRequest(
        `/api/menu/${branchId}/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            available: !item.available,
          }),
        }
      );

      setMenu((current) =>
        current.map((entry) =>
          entry.id === id
            ? normalizeMenuItem(updatedItem)
            : entry
        )
      );
    } catch (error) {
      window.alert(
        `Unable to change menu item availability: ${error.message}`
      );
    }
  }

  async function deleteMenuItem(id) {
    const item = menu.find((entry) => entry.id === id);

    if (!item) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await apiRequest(`/api/menu/${branchId}/${id}`, {
        method: "DELETE",
      });

      setMenu((current) =>
        current.filter((entry) => entry.id !== id)
      );

      window.alert("Menu item deleted successfully.");
    } catch (error) {
      window.alert(`Unable to delete menu item: ${error.message}`);
    }
  }

  return (
    <section className="menu-management">
      <div className="menu-page-heading">
        <div>
          <p>
            Manage your dishes, pricing, categories, and menu availability.
          </p>
        </div>

        <button className="menu-primary-button" onClick={openAddForm}>
          <span aria-hidden="true">+</span> Add Menu Item
        </button>
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

<div className="branch-selector-wrapper">
  <label htmlFor="menu-branch-selector" className="branch-filter-label">
    Branch
  </label>

  <select
    id="menu-branch-selector"
    className="branch-selector"
    value={branchId || ""}
    onChange={(event) => onBranchChange(event.target.value)}
    disabled={branchLoading || !branches?.length}
  >
    {branchLoading ? (
      <option value="">Loading branches...</option>
    ) : !branches?.length ? (
      <option value="">No branches available</option>
    ) : (
      branches.map((branch) => (
        <option key={branch._id} value={branch._id}>
          {branch.name}
        </option>
      ))
    )}
  </select>

  {branchError && (
    <span className="branch-selector-error" role="alert">
      {branchError}
    </span>
  )}
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
            <p>
              {loading
                ? "Loading menu items..."
                : `${filteredMenu.length} items found`}
            </p>
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
                        item.available
                          ? "is-available"
                          : "is-unavailable"
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

              {!loading && filteredMenu.length === 0 && (
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
                <span className="menu-eyebrow">
                  MENU CONFIGURATION
                </span>

                <h2 id="menu-modal-title">
                  {editingId !== null
                    ? "Edit Menu Item"
                    : "Add Menu Item"}
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
  Select Branch

  <select
    name="branchId"
    value={form.branchId}
    onChange={handleFormChange}
    required
  >
    <option value="">Select a branch</option>

    {branches.map((branch) => (
      <option key={branch._id} value={branch._id}>
        {branch.name}
      </option>
    ))}
  </select>
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
  Dietary Preference

  <select
    name="dietary"
    value={form.dietary}
    onChange={handleFormChange}
    required
  >
    <option value="Vegetarian">Vegetarian</option>
    <option value="Vegan">Vegan</option>
    <option value="Non-Vegetarian">Non-Vegetarian</option>
  </select>
</label>

<label>
  Spice Level

  <select
    name="spice"
    value={form.spice}
    onChange={handleFormChange}
    required
  >
    <option value="Mild">Mild</option>
    <option value="Medium">Medium</option>
    <option value="Hot">Hot</option>
  </select>
</label>

<label>
  Ingredients

  <textarea
    name="ingredients"
    value={form.ingredients}
    onChange={handleFormChange}
    placeholder="e.g. Paneer, Tomato, Onion, Capsicum"
    rows={3}
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

                <button
                  type="submit"
                  className="menu-primary-button"
                >
                  {editingId !== null
                    ? "Save Changes"
                    : "Add Menu Item"}
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