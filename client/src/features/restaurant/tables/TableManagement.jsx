import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Plus, Pencil, Trash2 } from "lucide-react";
import "../../../styles/table-management.css";
import "../../../styles/menu-management.css";
import { apiRequest } from "../../../services/api";

const ALL_BRANCHES = "all";

const emptyForm = {
  number: "",
  capacity: "2",
  location: "Indoor",
  status: "Available",
  branchId: "",
};

const statuses = ["Available", "Occupied", "Reserved"];
const locations = ["Indoor", "Outdoor", "Private Dining"];

// Normalize MongoDB documents for consistent frontend usage.
function normalizeTable(table, fallbackBranchId = "") {
  if (!table) return null;

  const rawBranchId = table.branchId ?? table.branch;

  const normalizedBranchId =
    rawBranchId && typeof rawBranchId === "object"
      ? rawBranchId._id || rawBranchId.id || ""
      : rawBranchId || fallbackBranchId;

  return {
    ...table,
    id: String(table._id || table.id || ""),
    branchId: String(normalizedBranchId || ""),
    number: String(table.number ?? ""),
    capacity: Number(table.capacity ?? 0),
    location: table.location || "Indoor",
    status: table.status || "Available",
  };
}

function getBranchName(branches, branchId) {
  const branch = branches.find(
    (item) => String(item._id || item.id) === String(branchId)
  );

  return branch?.name || branch?.branchName || branch?.code || "Unknown Branch";
}

function TableManagement({
  branchId = ALL_BRANCHES,
  branches = [],
  onBranchChange,
  branchLoading = false,
  branchError = "",
}) {
  const [tables, setTables] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Load tables for the selected branch or all available branches.
  const loadTables = useCallback(async () => {
    if (branchLoading) {
      setLoading(true);
      return;
    }

    if (branchError) {
      setTables([]);
      setLoadError(branchError);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      let data = [];

      if (branchId === ALL_BRANCHES) {
        if (branches.length > 0) {
          const results = await Promise.all(
            branches.map(async (branch) => {
              const currentBranchId = String(branch._id || branch.id || "");

              if (!currentBranchId) return [];

              const response = await apiRequest(
                `/api/tables/${currentBranchId}`
              );

              if (!Array.isArray(response)) {
                throw new Error(
                  `Invalid table data received for ${
                    branch.name || branch.branchName || "a branch"
                  }.`
                );
              }

              return response
                .map((table) => normalizeTable(table, currentBranchId))
                .filter(Boolean);
            })
          );

          const uniqueTables = new Map();

          results.flat().forEach((table) => {
            const key = table.id || `${table.branchId}-${table.number}`;

            if (key) {
              uniqueTables.set(key, table);
            }
          });

          data = Array.from(uniqueTables.values());
        }
      } else if (branchId) {
        const response = await apiRequest(`/api/tables/${branchId}`);

        if (!Array.isArray(response)) {
          throw new Error("Invalid table data received from the server.");
        }

        data = response
          .map((table) => normalizeTable(table, branchId))
          .filter(Boolean);
      }

      setTables(data);
      setLoadError("");
    } catch (error) {
      setTables([]);
      setLoadError(error.message || "Unable to load restaurant tables.");
    } finally {
      setLoading(false);
    }
  }, [branchId, branches, branchLoading, branchError]);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  // Search and status filtering.
  const filteredTables = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return tables.filter((table) => {
      const matchesSearch = table.number.toLowerCase().includes(searchTerm);

      const matchesStatus =
        statusFilter === "All Statuses" || table.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tables, search, statusFilter]);

  function openAddForm() {
    setEditingId(null);

    setForm({
      ...emptyForm,
      branchId:
        branchId && branchId !== ALL_BRANCHES ? String(branchId) : "",
    });

    setShowForm(true);
  }

  function openEditForm(table) {
    setEditingId(table.id);

    setForm({
      number: table.number,
      capacity: String(table.capacity),
      location: table.location,
      status: table.status,
      branchId: table.branchId,
    });

    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    const number = form.number.trim().toUpperCase();
    const capacity = Number(form.capacity);
    const targetBranchId = String(form.branchId || "");

    if (
      !targetBranchId ||
      targetBranchId === ALL_BRANCHES ||
      !branches.some(
        (branch) => String(branch._id || branch.id) === targetBranchId
      )
    ) {
      window.alert("Please select a valid branch.");
      return;
    }

    if (
      !number ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 100
    ) {
      window.alert(
        "Enter a valid table number and a seating capacity between 1 and 100."
      );
      return;
    }

    if (!locations.includes(form.location)) {
      window.alert("Please select a valid table location.");
      return;
    }

    if (!statuses.includes(form.status)) {
      window.alert("Please select a valid table status.");
      return;
    }

    const existingTable = editingId
      ? tables.find((table) => table.id === editingId)
      : null;

    if (editingId && !existingTable) {
      window.alert("The table could not be found. Refresh and try again.");
      return;
    }

    // Editing does not transfer a table to another branch.
    if (existingTable && existingTable.branchId !== targetBranchId) {
      window.alert(
        "A table cannot be moved to another branch while editing."
      );
      return;
    }

    const duplicate = tables.some(
      (table) =>
        table.branchId === targetBranchId &&
        table.number.toLowerCase() === number.toLowerCase() &&
        table.id !== editingId
    );

    if (duplicate) {
      window.alert("This table number already exists in the selected branch.");
      return;
    }

    const tableData = {
      number,
      capacity,
      location: form.location,
      status: form.status,
    };

    setSaving(true);

    try {
      if (editingId) {
        const response = await apiRequest(
          `/api/tables/${targetBranchId}/${editingId}`,
          {
            method: "PUT",
            body: JSON.stringify(tableData),
          }
        );

        const updatedTable = normalizeTable(response, targetBranchId);

        if (!updatedTable?.id) {
          throw new Error("The server did not return the updated table.");
        }

        setTables((current) =>
          current.map((table) =>
            table.id === editingId ? updatedTable : table
          )
        );

        window.alert("Table updated successfully.");
      } else {
        const response = await apiRequest("/api/tables", {
          method: "POST",
          body: JSON.stringify({
            branchId: targetBranchId,
            ...tableData,
          }),
        });

        const createdTable = normalizeTable(response, targetBranchId);

        if (!createdTable?.id) {
          throw new Error(
            "The server did not return the created table. Refresh the list to verify whether it was saved."
          );
        }

        setTables((current) => [...current, createdTable]);

        window.alert("Table added successfully.");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      setLoadError("");
    } catch (error) {
      window.alert(`Unable to save table: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id, status) {
    const table = tables.find((item) => item.id === id);

    if (!table || table.status === status || updatingStatusId) {
      return;
    }

    if (!table.branchId || table.branchId === ALL_BRANCHES) {
      window.alert("Unable to identify this table's branch.");
      return;
    }

    setUpdatingStatusId(id);

    try {
      const response = await apiRequest(
        `/api/tables/${table.branchId}/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({ status }),
        }
      );

      const updatedTable = normalizeTable(response, table.branchId);

      if (!updatedTable?.id) {
        throw new Error("The server did not return the updated table.");
      }

      setTables((current) =>
        current.map((item) => (item.id === id ? updatedTable : item))
      );
    } catch (error) {
      window.alert(`Unable to change table status: ${error.message}`);
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function deleteTable(table) {
    if (deletingId) return;

    const targetBranchId = table.branchId;

    if (!targetBranchId || targetBranchId === ALL_BRANCHES) {
      window.alert("Unable to identify this table's branch.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete table ${table.number}?`
    );

    if (!confirmed) return;

    setDeletingId(table.id);

    try {
      await apiRequest(`/api/tables/${targetBranchId}/${table.id}`, {
        method: "DELETE",
      });

      setTables((current) =>
        current.filter((item) => item.id !== table.id)
      );

      window.alert("Table deleted successfully.");
    } catch (error) {
      window.alert(`Unable to delete table: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="table-management">
      <div className="table-page-heading">
        <div className="table-page-heading-copy">
          <p>
            Organise restaurant seating, monitor availability, and manage table
            assignments.
          </p>
        </div>

        <div className="table-heading-actions">
          <button
            type="button"
            className="menu-secondary-button menu-refresh-button"
            onClick={loadTables}
            disabled={loading || branchLoading}
            title="Refresh tables"
            aria-label="Refresh tables"
          >
            <RefreshCw
              size={15}
              className={loading ? "menu-spin" : ""}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="table-primary-button"
            onClick={openAddForm}
            disabled={branchLoading || Boolean(branchError) || saving}
          >
            <Plus size={16} />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      <div className="table-toolbar">
        <div className="table-search">
          <Search size={16} aria-hidden="true" />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by table number..."
            aria-label="Search tables"
          />
        </div>

        <div className="table-branch-filter">
          <label htmlFor="table-branch-select">Branch</label>

          <select
            id="table-branch-select"
            className="table-branch-select"
            value={branchId || ALL_BRANCHES}
            onChange={(event) => {
              onBranchChange?.(event.target.value);
              setShowForm(false);
              setEditingId(null);
            }}
            disabled={branchLoading || Boolean(branchError)}
            aria-label="Filter tables by branch"
          >
            <option value={ALL_BRANCHES}>All Branches</option>

            {branches.map((branch) => (
              <option
                key={branch._id || branch.id}
                value={branch._id || branch.id}
              >
                {branch.name || branch.branchName || branch._id || branch.id}
              </option>
            ))}
          </select>
        </div>

        <select
          className="table-status-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter tables by status"
        >
          <option value="All Statuses">All Statuses</option>

          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="table-list-container">
        <div className="table-list-heading">
          <div>
            <h2>Restaurant Tables</h2>
            <p>
              {loading
                ? "Loading tables..."
                : `${filteredTables.length} ${
                    filteredTables.length === 1 ? "table" : "tables"
                  } found`}
            </p>
          </div>
        </div>

        {loadError && (
          <div role="alert" className="table-load-error">
            <strong>Unable to load restaurant tables.</strong>
            <p>{loadError}</p>

            <button
              type="button"
              className="menu-secondary-button"
              onClick={loadTables}
              disabled={loading}
            >
              Try Again
            </button>
          </div>
        )}

        <div className="table-list-scroll">
          <table className="restaurant-table">
            <thead>
              <tr>
                <th>Table</th>
                <th>Branch</th>
                <th>Capacity</th>
                <th>Location</th>
                <th>Status</th>
                <th>Change Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="table-empty-state">
                    <RefreshCw size={18} className="menu-spin" />
                    <p>Loading restaurant tables...</p>
                  </td>
                </tr>
              )}

              {!loading &&
                !loadError &&
                filteredTables.map((table) => (
                  <tr key={table.id}>
                    <td>
                      <span className="restaurant-table-number">
                        {table.number}
                      </span>
                    </td>

                    <td>
                      <span className="table-branch-name">
                        {getBranchName(branches, table.branchId)}
                      </span>
                    </td>

                    <td>
                      {table.capacity}{" "}
                      {table.capacity === 1 ? "seat" : "seats"}
                    </td>

                    <td>{table.location}</td>

                    <td>
                      <span
                        className={`table-status status-${table.status
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        <span className="table-status-dot" />
                        {table.status}
                      </span>
                    </td>

                    <td>
                      <select
                        className="table-status-select"
                        aria-label={`Change status for ${table.number}`}
                        value={table.status}
                        disabled={
                          updatingStatusId === table.id ||
                          Boolean(deletingId) ||
                          loading
                        }
                        onChange={(event) =>
                          updateStatus(table.id, event.target.value)
                        }
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>

                    
<td>
  <div className="menu-row-actions">
    <button
      type="button"
      className="menu-action-button"
      onClick={() => openEditForm(table)}
      disabled={Boolean(saving || deletingId)}
      aria-label={`Edit table ${table.number}`}
      title="Edit table"
    >
      <Pencil size={14} aria-hidden="true" />
      <span>Edit</span>
    </button>

    <button
      type="button"
      className="menu-action-button menu-delete-button"
      onClick={() => deleteTable(table)}
      disabled={Boolean(saving || deletingId)}
      aria-label={`Delete table ${table.number}`}
      title="Delete table"
    >
      <Trash2 size={14} aria-hidden="true" />
      <span>
        {deletingId === table.id ? "Deleting..." : "Delete"}
      </span>
    </button>
  </div>
</td>

                  </tr>
                ))}

              {!loading && !loadError && filteredTables.length === 0 && (
                <tr>
                  <td colSpan={7} className="table-empty-state">
                    <strong>No tables found</strong>
                    <p>Try changing the search term or status filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div
          className="table-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <section
            className="table-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="table-modal-title"
          >
            <div className="table-modal-heading">
              <div>
                <span className="table-eyebrow">SEATING CONFIGURATION</span>
                <h2 id="table-modal-title">
                  {editingId ? "Edit Table" : "Add Table"}
                </h2>
              </div>

              <button
                type="button"
                className="table-modal-close"
                onClick={closeForm}
                aria-label="Close form"
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>
                Table Number
                <input
                  name="number"
                  value={form.number}
                  onChange={handleChange}
                  placeholder="e.g. T-09"
                  maxLength={20}
                  required
                />
              </label>

              <label>
                Branch
                <select
                  name="branchId"
                  value={form.branchId}
                  onChange={handleChange}
                  required
                  disabled={
                    branchLoading || Boolean(branchError) || Boolean(editingId)
                  }
                >
                  <option value="">Select Branch</option>

                  {branches.map((branch) => (
                    <option
                      key={branch._id || branch.id}
                      value={branch._id || branch.id}
                    >
                      {branch.name ||
                        branch.branchName ||
                        branch._id ||
                        branch.id}
                    </option>
                  ))}
                </select>

                {editingId && (
                  <small>
                    A table remains assigned to its original branch when
                    edited.
                  </small>
                )}
              </label>

              <label>
                Seating Capacity
                <input
                  name="capacity"
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={form.capacity}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Location
                <select
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  required
                >
                  {locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Status
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  required
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <div className="table-modal-actions">
                <button
                  type="button"
                  className="table-secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="table-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Add Table"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

export default TableManagement;
