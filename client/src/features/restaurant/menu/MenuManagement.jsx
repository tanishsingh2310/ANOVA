import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import "../../../styles/menu-management.css";
import { apiRequest } from "../../../services/api";

const ALL_BRANCHES = "all";

const emptyForm = {
  name: "",
  branchId: "",
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

function getBranchId(item) {
  const branch = item?.branchId ?? item?.branch;

  if (branch && typeof branch === "object") {
    return String(branch._id || branch.id || "");
  }

  return branch ? String(branch) : "";
}

function normalizeMenuItem(item, fallbackBranchId = "") {
  return {
    ...item,
    id: item._id || item.id,
    branchId: getBranchId(item) || String(fallbackBranchId || ""),
  };
}

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function MenuManagement({
  branchId = ALL_BRANCHES,
  branches = [],
  onBranchChange,
  branchLoading = false,
  branchError = "",
}) {
  const [menu, setMenu] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [availabilityFilter, setAvailabilityFilter] = useState("All Items");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState(null);

  const [saving, setSaving] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [busyItemId, setBusyItemId] = useState(null);

  const [formError, setFormError] = useState("");

  const selectedBranchId = String(branchId || ALL_BRANCHES);

  const branchOptions = useMemo(
    () => (Array.isArray(branches) ? branches : []),
    [branches]
  );

  const branchNames = useMemo(() => {
    const names = new Map();

    branchOptions.forEach((branch) => {
      const id = branch?._id || branch?.id;

      if (id) {
        names.set(String(id), branch.name || "Unnamed Branch");
      }
    });

    return names;
  }, [branchOptions]);

  const getBranchName = useCallback(
    (item) => {
      const id = getBranchId(item);

      if (id && branchNames.has(id)) {
        return branchNames.get(id);
      }

      if (item?.branch && typeof item.branch === "object") {
        return item.branch.name || "Unknown Branch";
      }

      return id ? "Unknown Branch" : "Unknown Branch";
    },
    [branchNames]
  );

  const notify = useCallback((type, message) => {
    setNotice({
      type,
      message,
      id: `${Date.now()}-${Math.random()}`,
    });
  }, []);

  // Load one branch or combine menu items from every available branch.
  useEffect(() => {
    let active = true;

    async function loadMenu() {
      setLoading(true);
      setLoadError("");

      try {
        if (branchLoading) {
          return;
        }

        if (branchError) {
          throw new Error(branchError);
        }

        if (selectedBranchId === ALL_BRANCHES) {
          if (branchOptions.length === 0) {
            setMenu([]);
            return;
          }

          const results = await Promise.all(
            branchOptions.map(async (branch) => {
              const id = String(branch._id || branch.id || "");

              if (!id) {
                throw new Error(
                  "A branch is missing its ID. Please refresh the branches."
                );
              }

              const data = await apiRequest(`/api/menu/${id}`);

              if (!Array.isArray(data)) {
                throw new Error(
                  `The server returned an invalid menu response for ${
                    branch.name || "a branch"
                  }.`
                );
              }

              return data.map((item) => normalizeMenuItem(item, id));
            })
          );

          if (active) {
            const combinedMenu = results.flat();

            // Prevent duplicate entries if an API response contains duplicates.
            const uniqueMenu = Array.from(
              new Map(
                combinedMenu.map((item) => [String(item.id), item])
              ).values()
            );

            setMenu(uniqueMenu);
          }
        } else {
          const data = await apiRequest(
            `/api/menu/${selectedBranchId}`
          );

          if (!Array.isArray(data)) {
            throw new Error(
              "The server returned an invalid menu response."
            );
          }

          if (active) {
            setMenu(
              data.map((item) =>
                normalizeMenuItem(item, selectedBranchId)
              )
            );
          }
        }
      } catch (error) {
        if (active) {
          setMenu([]);
          setLoadError(
            getErrorMessage(error, "Unable to load menu items.")
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadMenu();

    return () => {
      active = false;
    };
  }, [
    selectedBranchId,
    branchOptions,
    branchLoading,
    branchError,
    refreshKey,
  ]);

  const filteredMenu = useMemo(() => {
    const query = search.trim().toLowerCase();

    return menu.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const description = String(item.description || "").toLowerCase();

      const matchesSearch =
        !query || name.includes(query) || description.includes(query);

      const matchesCategory =
        categoryFilter === "All Categories" ||
        item.category === categoryFilter;

      const matchesAvailability =
        availabilityFilter === "All Items" ||
        (availabilityFilter === "Available" && item.available === true) ||
        (availabilityFilter === "Unavailable" && item.available !== true);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesAvailability
      );
    });
  }, [menu, search, categoryFilter, availabilityFilter]);

  function refreshMenu() {
    setNotice(null);
    setRefreshKey((current) => current + 1);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  }

  function openAddForm() {
    setEditingId(null);

    setForm({
      ...emptyForm,
      // All Branches is a filter, not a valid branch for creating an item.
      branchId:
        selectedBranchId !== ALL_BRANCHES ? selectedBranchId : "",
    });

    setFormError("");
    setNotice(null);
    setShowForm(true);
  }

  function openEditForm(item) {
    setEditingId(item.id);

    setForm({
      name: item.name || "",
      branchId: getBranchId(item),
      category: item.category || "Starters",
      description: item.description || "",
      price: String(item.price ?? ""),
      dietary: item.dietary || "Vegetarian",
      spice: item.spice || "Medium",
      ingredients: Array.isArray(item.ingredients)
        ? item.ingredients.join(", ")
        : typeof item.ingredients === "string"
          ? item.ingredients
          : "",
    });

    setFormError("");
    setNotice(null);
    setShowForm(true);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (formError) setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    const name = form.name.trim();
    const description = form.description.trim();
    const price = Number(form.price);

    if (!name || name.length > 100) {
      setFormError("Enter a dish name between 1 and 100 characters.");
      return;
    }

    if (!description || description.length > 500) {
      setFormError(
        "Enter a description between 1 and 500 characters."
      );
      return;
    }

    if (
      form.price === "" ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      setFormError("Enter a valid price greater than zero.");
      return;
    }

    if (!form.category) {
      setFormError("Select a menu category.");
      return;
    }

    if (
      editingId === null &&
      !branchOptions.some(
        (branch) =>
          String(branch._id || branch.id) === String(form.branchId)
      )
    ) {
      setFormError("Select a valid branch for this menu item.");
      return;
    }

    const existingItem =
      editingId !== null
        ? menu.find((item) => String(item.id) === String(editingId))
        : null;

    if (editingId !== null && !existingItem) {
      setFormError("The menu item could not be found. Refresh the menu.");
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

    setSaving(true);
    setFormError("");
    setNotice(null);

    try {
      if (editingId !== null) {
        const itemBranchId = getBranchId(existingItem);

        if (!itemBranchId || itemBranchId === ALL_BRANCHES) {
          throw new Error(
            "The item's branch could not be determined. Refresh the menu."
          );
        }

        const updatedItem = await apiRequest(
          `/api/menu/${itemBranchId}/${editingId}`,
          {
            method: "PUT",
            body: JSON.stringify(menuItemData),
          }
        );

        setMenu((current) =>
          current.map((item) =>
            String(item.id) === String(editingId)
              ? normalizeMenuItem(updatedItem, itemBranchId)
              : item
          )
        );

        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        notify("success", "Menu item updated successfully.");
      } else {
        const selectedFormBranchId = String(form.branchId);

        const createdItem = await apiRequest("/api/menu", {
          method: "POST",
          body: JSON.stringify({
            ...menuItemData,
            branchId: selectedFormBranchId,
            available: true,
          }),
        });

        const normalizedCreatedItem = normalizeMenuItem(
          createdItem,
          selectedFormBranchId
        );

        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);

        if (selectedBranchId === ALL_BRANCHES) {
          // Keep the All Branches view selected and show the new item.
          setMenu((current) => [
            normalizedCreatedItem,
            ...current.filter(
              (item) => String(item.id) !== String(normalizedCreatedItem.id)
            ),
          ]);
        } else if (selectedFormBranchId !== selectedBranchId) {
          // Only switch branches when the user was viewing one specific branch.
          if (onBranchChange) {
            onBranchChange(selectedFormBranchId);
          } else {
            setRefreshKey((current) => current + 1);
          }
        } else {
          setMenu((current) => [
            normalizedCreatedItem,
            ...current.filter(
              (item) => String(item.id) !== String(normalizedCreatedItem.id)
            ),
          ]);
        }

        notify("success", "Menu item added successfully.");
      }
    } catch (error) {
      setFormError(
        getErrorMessage(error, "Unable to save the menu item.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(id) {
    if (busyItemId || deleting || saving) return;

    const item = menu.find(
      (entry) => String(entry.id) === String(id)
    );

    if (!item) return;

    const itemBranchId = getBranchId(item);

    if (!itemBranchId || itemBranchId === ALL_BRANCHES) {
      notify("error", "Unable to determine this item's branch.");
      return;
    }

    setBusyItemId(id);
    setNotice(null);

    try {
      const updatedItem = await apiRequest(
        `/api/menu/${itemBranchId}/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            available: item.available !== true,
          }),
        }
      );

      setMenu((current) =>
        current.map((entry) =>
          String(entry.id) === String(id)
            ? normalizeMenuItem(updatedItem, itemBranchId)
            : entry
        )
      );

      notify(
        "success",
        updatedItem.available
          ? "Menu item is now available."
          : "Menu item is now unavailable."
      );
    } catch (error) {
      notify(
        "error",
        getErrorMessage(error, "Unable to change availability.")
      );
    } finally {
      setBusyItemId(null);
    }
  }

  async function confirmDelete() {
    if (!deletingItem || deleting) return;

    const id = deletingItem.id;
    const itemBranchId = getBranchId(deletingItem);

    if (!itemBranchId || itemBranchId === ALL_BRANCHES) {
      notify("error", "Unable to determine this item's branch.");
      setDeletingItem(null);
      return;
    }

    setDeleting(true);
    setNotice(null);

    try {
      await apiRequest(`/api/menu/${itemBranchId}/${id}`, {
        method: "DELETE",
      });

      setMenu((current) =>
        current.filter((item) => String(item.id) !== String(id))
      );

      setDeletingItem(null);
      notify(
        "success",
        `"${deletingItem.name}" was deleted successfully.`
      );
    } catch (error) {
      notify(
        "error",
        getErrorMessage(error, "Unable to delete the menu item.")
      );
    } finally {
      setDeleting(false);
    }
  }

  const formBranchName =
    branchNames.get(String(form.branchId)) ||
    (form.branchId ? "Current item branch" : "No branch selected");

  const currentBranchLabel =
    selectedBranchId === ALL_BRANCHES
      ? "All Branches"
      : branchNames.get(selectedBranchId) || "Selected Branch";

  return (
    <section className="menu-management">
      <div className="menu-page-heading">
        <div className="menu-page-heading-copy">
          <p>
            Manage your dishes, pricing, categories, and menu availability.
          </p>
        </div>

        <div className="menu-header-actions">
          <button
            type="button"
            className="menu-secondary-button menu-refresh-button"
            onClick={refreshMenu}
            disabled={loading || branchLoading}
          >
            <RefreshCw
              size={15}
              className={loading ? "menu-spin" : ""}
              aria-hidden="true"
            />
            Refresh
          </button>

          <button
            type="button"
            className="menu-primary-button"
            onClick={openAddForm}
            disabled={branchLoading || !branchOptions.length}
          >
            <Plus size={17} aria-hidden="true" />
            Add Menu Item
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`menu-notice menu-notice-${notice.type}`}
          role={notice.type === "error" ? "alert" : "status"}
          key={notice.id}
        >
          {notice.type === "success" ? (
            <CheckCircle2 size={18} aria-hidden="true" />
          ) : (
            <AlertCircle size={18} aria-hidden="true" />
          )}

          <span>{notice.message}</span>

          <button
            type="button"
            className="menu-notice-close"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="menu-toolbar">
        <div className="menu-search">
          <Search size={17} aria-hidden="true" />

          <input
            type="search"
            placeholder="Search dishes or descriptions..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search menu"
          />

          {search && (
            <button
              type="button"
              className="menu-search-clear"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="branch-selector-wrapper">
          <label
            htmlFor="menu-branch-selector"
            className="branch-filter-label"
          >
            Branch
          </label>

          <select
            id="menu-branch-selector"
            className="branch-selector"
            value={selectedBranchId}
            onChange={(event) => {
              setNotice(null);
              onBranchChange?.(event.target.value);
            }}
            disabled={branchLoading || !branchOptions.length}
          >
            <option value={ALL_BRANCHES}>All Branches</option>

            {branchOptions.map((branch) => {
              const id = String(branch._id || branch.id);

              return (
                <option key={id} value={id}>
                  {branch.name}
                </option>
              );
            })}
          </select>

          {branchError && (
            <span className="branch-selector-error" role="alert">
              {branchError}
            </span>
          )}
        </div>

        <select
          className="menu-filter-select"
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
          className="menu-filter-select"
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
                : loadError
                  ? "Menu could not be loaded"
                  : `${filteredMenu.length} ${
                      filteredMenu.length === 1 ? "item" : "items"
                    } found`}
            </p>
          </div>

          <span className="menu-current-branch">
            {currentBranchLabel}
          </span>
        </div>

        <div className="menu-table-scroll">
          <table className="menu-table">
            <colgroup>
              <col className="menu-col-item" />
              <col className="menu-col-category" />
              <col className="menu-col-price" />
              <col className="menu-col-branch" />
              <col className="menu-col-availability" />
              <col className="menu-col-actions" />
            </colgroup>

            <thead>
              <tr>
                <th scope="col">Menu Item</th>
                <th scope="col">Category</th>
                <th scope="col">Price</th>
                <th scope="col">Branch</th>
                <th scope="col">Availability</th>
                <th scope="col" className="menu-actions-heading">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="menu-state-cell">
                    <div className="menu-loading-state">
                      <LoaderCircle
                        size={24}
                        className="menu-spin"
                        aria-hidden="true"
                      />
                      <strong>Loading menu items</strong>
                      <span>Please wait while we fetch your menu.</span>
                    </div>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={6} className="menu-state-cell">
                    <div className="menu-error-state">
                      <AlertCircle size={27} aria-hidden="true" />
                      <strong>Unable to load menu</strong>
                      <p>{loadError}</p>
                      <button
                        type="button"
                        className="menu-secondary-button"
                        onClick={refreshMenu}
                      >
                        <RefreshCw size={14} />
                        Try Again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : branchLoading ? (
                <tr>
                  <td colSpan={6} className="menu-state-cell">
                    <div className="menu-loading-state">
                      <LoaderCircle
                        size={24}
                        className="menu-spin"
                        aria-hidden="true"
                      />
                      <strong>Loading branches</strong>
                      <span>Please wait while we load your branches.</span>
                    </div>
                  </td>
                </tr>
              ) : branchOptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="menu-state-cell">
                    <div className="menu-empty-state">
                      <strong>No branches available</strong>
                      <p>
                        Branches must be available before menu items can be
                        displayed or created.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredMenu.length === 0 ? (
                <tr>
                  <td colSpan={6} className="menu-state-cell">
                    <div className="menu-empty-state">
                      <div className="menu-empty-icon">
                        <Search size={23} aria-hidden="true" />
                      </div>
                      <strong>
                        {menu.length === 0
                          ? "No menu items yet"
                          : "No matching menu items"}
                      </strong>
                      <p>
                        {menu.length === 0
                          ? selectedBranchId === ALL_BRANCHES
                            ? "No menu items were found across your branches. Add a dish to get started."
                            : "No menu items were found for this branch. Add a dish to get started."
                          : "Try another search term or adjust your filters."}
                      </p>

                      {menu.length === 0 && (
                        <button
                          type="button"
                          className="menu-primary-button"
                          onClick={openAddForm}
                        >
                          <Plus size={16} />
                          Add Menu Item
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMenu.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="menu-item-cell">
                        <div className="menu-item-avatar" aria-hidden="true">
                          {(item.name || "?").trim().charAt(0).toUpperCase()}
                        </div>

                        <div className="menu-item-copy">
                          <div className="menu-item-name">{item.name}</div>
                          <div className="menu-item-description">
                            {item.description || "No description provided."}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="menu-category-badge">
                        {item.category || "Uncategorized"}
                      </span>
                    </td>

                    <td className="menu-price">
                      ₹
                      {Number(item.price || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    <td>
                      <span
                        className="menu-branch-name"
                        title={getBranchName(item)}
                      >
                        {getBranchName(item)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`menu-status ${
                          item.available === true
                            ? "is-available"
                            : "is-unavailable"
                        }`}
                      >
                        <span className="menu-status-dot" />
                        {item.available === true
                          ? "Available"
                          : "Unavailable"}
                      </span>
                    </td>

                    <td>
                      <div className="menu-row-actions">
                        <button
                          type="button"
                          className="menu-action-button"
                          onClick={() => openEditForm(item)}
                          disabled={Boolean(busyItemId) || deleting || saving}
                          aria-label={`Edit ${item.name}`}
                          title="Edit menu item"
                        >
                          <Pencil size={14} aria-hidden="true" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          className="menu-action-button menu-toggle-button"
                          onClick={() => toggleAvailability(item.id)}
                          disabled={
                            Boolean(busyItemId) || deleting || saving
                          }
                          aria-label={`${
                            item.available === true ? "Disable" : "Enable"
                          } ${item.name}`}
                          title={
                            item.available === true
                              ? "Mark unavailable"
                              : "Mark available"
                          }
                        >
                          {busyItemId === item.id ? (
                            <LoaderCircle
                              size={14}
                              className="menu-spin"
                            />
                          ) : (
                            <span>
                              {item.available === true
                                ? "Disable"
                                : "Enable"}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          className="menu-action-button menu-delete-button"
                          onClick={() => setDeletingItem(item)}
                          disabled={
                            Boolean(busyItemId) || deleting || saving
                          }
                          aria-label={`Delete ${item.name}`}
                          title="Delete menu item"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
              closeForm();
            }
          }}
        >
          <section
            className="menu-modal menu-form-modal"
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

                <p className="menu-modal-subtitle">
                  {editingId !== null
                    ? "Update the details and availability of this dish."
                    : "Add a dish to a specific restaurant branch."}
                </p>
              </div>

              <button
                type="button"
                className="menu-modal-close"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            {formError && (
              <div className="menu-form-error" role="alert">
                <AlertCircle size={17} aria-hidden="true" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="menu-form-grid">
                <label className="menu-form-field">
                  <span>
                    Dish Name <span className="menu-required">*</span>
                  </span>

                  <input
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="e.g. Paneer Tikka"
                    required
                    maxLength={100}
                    autoFocus
                  />
                </label>

                <label className="menu-form-field">
                  <span>
                    Category <span className="menu-required">*</span>
                  </span>

                  <select
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    required
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="menu-form-field menu-form-field-full">
                  <span>
                    Description <span className="menu-required">*</span>
                  </span>

                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    placeholder="Describe the dish and its key features..."
                    rows={3}
                    required
                    maxLength={500}
                  />

                  <small>{form.description.length}/500 characters</small>
                </label>

                <label className="menu-form-field">
                  <span>
                    Price (₹) <span className="menu-required">*</span>
                  </span>

                  <input
                    name="price"
                    type="number"
                    min="0.01"
                    max="10000000"
                    step="0.01"
                    value={form.price}
                    onChange={handleFormChange}
                    placeholder="e.g. 280"
                    required
                  />
                </label>

                <label className="menu-form-field">
                  <span>
                    Dietary Preference <span className="menu-required">*</span>
                  </span>

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

                <label className="menu-form-field">
                  <span>
                    Spice Level <span className="menu-required">*</span>
                  </span>

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

                <label className="menu-form-field">
                  <span>
                    Branch <span className="menu-required">*</span>
                  </span>

                  {editingId !== null ? (
                    <>
                      <input
                        value={formBranchName}
                        readOnly
                        aria-label="Menu item's branch"
                      />
                      <small>
                        A menu item's branch cannot be changed while editing.
                      </small>
                    </>
                  ) : (
                    <select
                      name="branchId"
                      value={form.branchId}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Select a branch</option>

                      {branchOptions.map((branch) => {
                        const id = String(branch._id || branch.id);

                        return (
                          <option key={id} value={id}>
                            {branch.name}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </label>

                <label className="menu-form-field menu-form-field-full">
                  <span>Ingredients</span>

                  <textarea
                    name="ingredients"
                    value={form.ingredients}
                    onChange={handleFormChange}
                    placeholder="e.g. Paneer, Tomato, Onion, Capsicum"
                    rows={2}
                  />

                  <small>Separate ingredients with commas.</small>
                </label>
              </div>

              <div className="menu-modal-actions">
                <button
                  type="button"
                  className="menu-secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="menu-primary-button"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <LoaderCircle
                        size={16}
                        className="menu-spin"
                        aria-hidden="true"
                      />
                      Saving...
                    </>
                  ) : editingId !== null ? (
                    <>
                      <CheckCircle2 size={16} aria-hidden="true" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Plus size={17} aria-hidden="true" />
                      Add Menu Item
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deletingItem && (
        <div
          className="menu-modal-backdrop menu-confirm-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !deleting
            ) {
              setDeletingItem(null);
            }
          }}
        >
          <section
            className="menu-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="menu-delete-title"
            aria-describedby="menu-delete-description"
          >
            <div className="menu-confirm-icon">
              <Trash2 size={23} aria-hidden="true" />
            </div>

            <h2 id="menu-delete-title">Delete Menu Item?</h2>

            <p id="menu-delete-description">
              Are you sure you want to delete{" "}
              <strong>{deletingItem.name}</strong>? This action cannot be
              undone.
            </p>

            <div className="menu-confirm-actions">
              <button
                type="button"
                className="menu-secondary-button"
                onClick={() => setDeletingItem(null)}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="menu-danger-button"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <LoaderCircle
                      size={16}
                      className="menu-spin"
                      aria-hidden="true"
                    />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} aria-hidden="true" />
                    Delete Item
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

export default MenuManagement;
