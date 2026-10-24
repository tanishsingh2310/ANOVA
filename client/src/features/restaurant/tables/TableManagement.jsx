
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import "../../../styles/table-management.css";
import { apiRequest } from "../../../services/api";

const ALL_BRANCHES = "all";
const ITEMS_PER_PAGE = 10;

const emptyForm = {
  number: "",
  capacity: "2",
  location: "Indoor",
  status: "Available",
  branchId: "",
};

const statuses = ["Available", "Occupied", "Reserved"];
const locations = ["Indoor", "Outdoor", "Private Dining"];

const capacityRanges = [
  { label: "1–2 Seats", value: "1-2 Seats" },
  { label: "3–4 Seats", value: "3-4 Seats" },
  { label: "5–6 Seats", value: "5-6 Seats" },
  { label: "7+ Seats", value: "7+ Seats" },
];

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

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
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
  const [locationFilter, setLocationFilter] = useState("All Locations");
  const [capacityFilter, setCapacityFilter] = useState("All Capacities");
  const [currentPage, setCurrentPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState(null);
  const [formError, setFormError] = useState("");

  const [saving, setSaving] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [busyItemId, setBusyItemId] = useState(null);

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
        names.set(
          String(id),
          branch.name ||
            branch.branchName ||
            branch.code ||
            "Unnamed Branch"
        );
      }
    });

    return names;
  }, [branchOptions]);

  const getBranchName = useCallback(
    (table) => {
      if (table.branchId && branchNames.has(table.branchId)) {
        return branchNames.get(table.branchId);
      }

      const rawBranch = table.branch;

      if (rawBranch && typeof rawBranch === "object") {
        return (
          rawBranch.name ||
          rawBranch.branchName ||
          "Unknown Branch"
        );
      }

      return "Unknown Branch";
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

  // Reset filters when the selected branch changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch("");
    setStatusFilter("All Statuses");
    setLocationFilter("All Locations");
    setCapacityFilter("All Capacities");
    setCurrentPage(1);
  }, [selectedBranchId]);

  // Reset the branch and filters when this page mounts.
  useEffect(() => {
    onBranchChange?.(ALL_BRANCHES);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch("");
    setStatusFilter("All Statuses");
    setLocationFilter("All Locations");
    setCapacityFilter("All Capacities");
    setCurrentPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      if (selectedBranchId === ALL_BRANCHES) {
        if (branchOptions.length > 0) {
          const results = await Promise.all(
            branchOptions.map(async (branch) => {
              const currentBranchId = String(
                branch._id || branch.id || ""
              );

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
                .map((table) =>
                  normalizeTable(table, currentBranchId)
                )
                .filter(Boolean);
            })
          );

          const uniqueTables = new Map();

          results.flat().forEach((table) => {
            const key =
              table.id || `${table.branchId}-${table.number}`;

            if (key) {
              uniqueTables.set(key, table);
            }
          });

          data = Array.from(uniqueTables.values());
        }
      } else {
        const response = await apiRequest(
          `/api/tables/${selectedBranchId}`
        );

        if (!Array.isArray(response)) {
          throw new Error(
            "Invalid table data received from the server."
          );
        }

        data = response
          .map((table) =>
            normalizeTable(table, selectedBranchId)
          )
          .filter(Boolean);
      }

      setTables(data);
      setLoadError("");
    } catch (error) {
      setTables([]);
      setLoadError(
        getErrorMessage(error, "Unable to load restaurant tables.")
      );
    } finally {
      setLoading(false);
    }
  }, [
    selectedBranchId,
    branchOptions,
    branchLoading,
    branchError,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTables();
  }, [loadTables, refreshKey]);

  const filteredTables = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tables.filter((table) => {
      const matchesSearch = table.number
        .toLowerCase()
        .includes(query);

      const matchesStatus =
        statusFilter === "All Statuses" ||
        table.status === statusFilter;

      const matchesLocation =
        locationFilter === "All Locations" ||
        table.location === locationFilter;

      const matchesCapacity =
        capacityFilter === "All Capacities" ||
        (capacityFilter === "1-2 Seats" &&
          table.capacity >= 1 &&
          table.capacity <= 2) ||
        (capacityFilter === "3-4 Seats" &&
          table.capacity >= 3 &&
          table.capacity <= 4) ||
        (capacityFilter === "5-6 Seats" &&
          table.capacity >= 5 &&
          table.capacity <= 6) ||
        (capacityFilter === "7+ Seats" &&
          table.capacity >= 7);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesLocation &&
        matchesCapacity
      );
    });
  }, [
    tables,
    search,
    statusFilter,
    locationFilter,
    capacityFilter,
  ]);

  // Reset pagination whenever the search or any filter changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [
    search,
    statusFilter,
    locationFilter,
    capacityFilter,
    selectedBranchId,
  ]);

  const totalPages = Math.ceil(
    filteredTables.length / ITEMS_PER_PAGE
  );
  const paginationPages = getPaginationPages(
  currentPage,
  totalPages
);

  const paginatedTables = filteredTables.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const currentBranchLabel =
    selectedBranchId === ALL_BRANCHES
      ? "All Branches"
      : branchNames.get(selectedBranchId) || "Selected Branch";

  const formBranchName =
    branchNames.get(String(form.branchId)) ||
    (form.branchId ? "Current table branch" : "No branch selected");

  function refreshTables() {
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
      branchId:
        selectedBranchId !== ALL_BRANCHES
          ? selectedBranchId
          : "",
    });

    setFormError("");
    setNotice(null);
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

    if (formError) {
      setFormError("");
    }
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
      !branchOptions.some(
        (branch) =>
          String(branch._id || branch.id) === targetBranchId
      )
    ) {
      setFormError("Please select a valid branch.");
      return;
    }

    if (
      !number ||
      number.length > 20 ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 100
    ) {
      setFormError(
        "Enter a valid table number and a seating capacity between 1 and 100."
      );
      return;
    }

    if (!locations.includes(form.location)) {
      setFormError("Please select a valid table location.");
      return;
    }

    if (!statuses.includes(form.status)) {
      setFormError("Please select a valid table status.");
      return;
    }

    const existingTable = editingId
      ? tables.find((table) => table.id === editingId)
      : null;

    if (editingId && !existingTable) {
      setFormError(
        "The table could not be found. Refresh and try again."
      );
      return;
    }

    if (
      existingTable &&
      existingTable.branchId !== targetBranchId
    ) {
      setFormError(
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
      setFormError(
        "This table number already exists in the selected branch."
      );
      return;
    }

    const tableData = {
      number,
      capacity,
      location: form.location,
      status: form.status,
    };

    setSaving(true);
    setFormError("");
    setNotice(null);

    try {
      if (editingId) {
        const response = await apiRequest(
          `/api/tables/${targetBranchId}/${editingId}`,
          {
            method: "PUT",
            body: JSON.stringify(tableData),
          }
        );

        const updatedTable = normalizeTable(
          response,
          targetBranchId
        );

        if (!updatedTable?.id) {
          throw new Error(
            "The server did not return the updated table."
          );
        }

        setTables((current) =>
          current.map((table) =>
            table.id === editingId ? updatedTable : table
          )
        );

        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        notify("success", "Table updated successfully.");
      } else {
        const response = await apiRequest("/api/tables", {
          method: "POST",
          body: JSON.stringify({
            branchId: targetBranchId,
            ...tableData,
          }),
        });

        const createdTable = normalizeTable(
          response,
          targetBranchId
        );

        if (!createdTable?.id) {
          throw new Error(
            "The server did not return the created table. Refresh the list to verify whether it was saved."
          );
        }

        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);

        setTables((current) => [
          createdTable,
          ...current.filter(
            (table) => table.id !== createdTable.id
          ),
        ]);

        notify("success", "Table added successfully.");
      }
    } catch (error) {
      setFormError(
        getErrorMessage(error, "Unable to save the table.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id, status) {
    const table = tables.find((item) => item.id === id);

    if (
      !table ||
      table.status === status ||
      busyItemId ||
      deleting ||
      saving
    ) {
      return;
    }

    if (!table.branchId || table.branchId === ALL_BRANCHES) {
      notify("error", "Unable to identify this table's branch.");
      return;
    }

    setBusyItemId(id);
    setNotice(null);

    try {
      const response = await apiRequest(
        `/api/tables/${table.branchId}/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({ status }),
        }
      );

      const updatedTable = normalizeTable(
        response,
        table.branchId
      );

      if (!updatedTable?.id) {
        throw new Error(
          "The server did not return the updated table."
        );
      }

      setTables((current) =>
        current.map((item) =>
          item.id === id ? updatedTable : item
        )
      );

      notify("success", `Table ${table.number} status updated.`);
    } catch (error) {
      notify(
        "error",
        getErrorMessage(error, "Unable to change table status.")
      );
    } finally {
      setBusyItemId(null);
    }
  }

  async function confirmDelete() {
    if (!deletingItem || deleting) return;

    const table = deletingItem;
    const targetBranchId = table.branchId;

    if (!targetBranchId || targetBranchId === ALL_BRANCHES) {
      notify("error", "Unable to identify this table's branch.");
      setDeletingItem(null);
      return;
    }

    setDeleting(true);
    setNotice(null);

    try {
      await apiRequest(
        `/api/tables/${targetBranchId}/${table.id}`,
        { method: "DELETE" }
      );

      setTables((current) =>
        current.filter((item) => item.id !== table.id)
      );

      setDeletingItem(null);
      notify(
        "success",
        `Table ${table.number} was deleted successfully.`
      );
    } catch (error) {
      notify(
        "error",
        getErrorMessage(error, "Unable to delete the table.")
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="table-management">
      <div className="table-page-heading">
        <div className="table-page-heading-copy">
          <p>
            Organise restaurant seating, monitor availability, and manage
            table assignments.
          </p>
        </div>

        <div className="table-header-actions">
          <button
            type="button"
            className="table-primary-button"
            onClick={openAddForm}
            disabled={
              branchLoading ||
              Boolean(branchError) ||
              branchOptions.length === 0 ||
              saving
            }
          >
            <Plus size={17} aria-hidden="true" />
            Add Table
          </button>

          <button
            type="button"
            className="table-secondary-button table-refresh-button"
            onClick={refreshTables}
            disabled={loading || branchLoading}
            title="Refresh tables"
          >
            <RefreshCw
              size={15}
              className={loading ? "table-spin" : ""}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`table-notice table-notice-${notice.type}`}
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
            className="table-notice-close"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="table-filter-card">
        <div className="table-toolbar">
          <label className="table-search">
            <Search size={17} aria-hidden="true" />

            <input
              type="search"
              placeholder="Search by table number..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search tables"
            />

            {search && (
              <button
                type="button"
                className="table-search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </label>

          <label className="table-filter">
            <span>Branch</span>

            <select
              id="table-branch-selector"
              value={selectedBranchId}
              onChange={(event) => {
                setNotice(null);
                setShowForm(false);
                setEditingId(null);
                onBranchChange?.(event.target.value);
              }}
              disabled={branchLoading || Boolean(branchError)}
              aria-label="Filter tables by branch"
            >
              <option value={ALL_BRANCHES}>All Branches</option>

              {branchOptions.map((branch) => {
                const id = String(branch._id || branch.id);

                return (
                  <option key={id} value={id}>
                    {branch.name ||
                      branch.branchName ||
                      branch.code ||
                      id}
                  </option>
                );
              })}
            </select>

            {branchError && (
              <small className="table-filter-error" role="alert">
                {branchError}
              </small>
            )}
          </label>

          <label className="table-filter">
            <span>Status</span>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              aria-label="Filter by table status"
            >
              <option value="All Statuses">All statuses</option>

              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="table-filter">
            <span>Location</span>

            <select
              value={locationFilter}
              onChange={(event) =>
                setLocationFilter(event.target.value)
              }
              aria-label="Filter by table location"
            >
              <option value="All Locations">All Locations</option>

              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>

          <label className="table-filter">
            <span>Capacity</span>

            <select
              value={capacityFilter}
              onChange={(event) =>
                setCapacityFilter(event.target.value)
              }
              aria-label="Filter by seating capacity"
            >
              <option value="All Capacities">All Capacities</option>

              {capacityRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="table-list-container">
        <div className="table-list-heading">
          <div>
            <h2>Restaurant Tables</h2>
            <p>
              {loading
                ? "Loading tables..."
                : loadError
                  ? "Tables could not be loaded"
                  : `${filteredTables.length} ${
                      filteredTables.length === 1 ? "table" : "tables"
                    } found`}
            </p>
          </div>

          <span className="table-current-branch">
            {currentBranchLabel}
          </span>
        </div>

        <div className="table-list-scroll">
          <table className="table-grid">
            <colgroup>
              <col className="table-col-number" />
              <col className="table-col-branch" />
              <col className="table-col-capacity" />
              <col className="table-col-location" />
              <col className="table-col-status" />
              <col className="table-col-change-status" />
              <col className="table-col-actions" />
            </colgroup>

            <thead>
              <tr>
                <th scope="col">Table</th>
                <th scope="col">Branch</th>
                <th scope="col">Capacity</th>
                <th scope="col">Location</th>
                <th scope="col">Status</th>
                <th scope="col">Change Status</th>
                <th scope="col" className="table-actions-heading">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="table-state-cell">
                    <div className="table-loading-state">
                      <LoaderCircle
                        size={24}
                        className="table-spin"
                        aria-hidden="true"
                      />
                      <strong>Loading restaurant tables</strong>
                      <span>
                        Please wait while we fetch your tables.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={7} className="table-state-cell">
                    <div className="table-error-state">
                      <AlertCircle size={27} aria-hidden="true" />
                      <strong>Unable to load tables</strong>
                      <p>{loadError}</p>

                      <button
                        type="button"
                        className="table-secondary-button"
                        onClick={refreshTables}
                      >
                        <RefreshCw size={14} />
                        Try Again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : branchLoading ? (
                <tr>
                  <td colSpan={7} className="table-state-cell">
                    <div className="table-loading-state">
                      <LoaderCircle
                        size={24}
                        className="table-spin"
                        aria-hidden="true"
                      />
                      <strong>Loading branches</strong>
                      <span>
                        Please wait while we load your branches.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : branchOptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-state-cell">
                    <div className="table-empty-state">
                      <strong>No branches available</strong>
                      <p>
                        Branches must be available before tables can be
                        displayed or created.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredTables.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-state-cell">
                    <div className="table-empty-state">
                      <div className="table-empty-icon">
                        <Search size={23} aria-hidden="true" />
                      </div>

                      <strong>
                        {tables.length === 0
                          ? "No tables yet"
                          : "No matching tables"}
                      </strong>

                      <p>
                        {tables.length === 0
                          ? selectedBranchId === ALL_BRANCHES
                            ? "No tables were found across your branches. Add a table to get started."
                            : "No tables were found for this branch. Add a table to get started."
                          : "Try another search term or adjust your branch, status, location, or capacity filters."}
                      </p>

                      {tables.length === 0 && (
                        <button
                          type="button"
                          className="table-primary-button"
                          onClick={openAddForm}
                        >
                          <Plus size={16} />
                          Add Table
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTables.map((table) => (
                  <tr key={table.id}>
                    <td>
                      <div className="table-item-cell">
                        <div
                          className="table-item-avatar"
                          aria-hidden="true"
                        >
                          {(table.number || "?")
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="table-item-copy">
                          <div className="table-item-name">
                            {table.number}
                          </div>
                          <div className="table-item-description">
                            Restaurant table
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className="table-branch-name"
                        title={getBranchName(table)}
                      >
                        {getBranchName(table)}
                      </span>
                    </td>

                    <td>
                      {table.capacity}{" "}
                      {table.capacity === 1 ? "seat" : "seats"}
                    </td>

                    <td>
                      <span className="table-location-badge">
                        {table.location}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`table-status-badge status-${table.status
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
                          busyItemId === table.id ||
                          Boolean(deletingItem) ||
                          saving
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
                      <div className="table-row-actions">
                        <button
                          type="button"
                          className="table-action-button"
                          onClick={() => openEditForm(table)}
                          disabled={
                            Boolean(busyItemId) ||
                            Boolean(deletingItem) ||
                            saving
                          }
                          aria-label={`Edit table ${table.number}`}
                          title="Edit table"
                        >
                          <Pencil size={14} aria-hidden="true" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          className="table-action-button table-delete-button"
                          onClick={() => setDeletingItem(table)}
                          disabled={
                            Boolean(busyItemId) ||
                            Boolean(deletingItem) ||
                            saving
                          }
                          aria-label={`Delete table ${table.number}`}
                          title="Delete table"
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

      
{totalPages > 1 && !loading && !loadError && (
  <div className="table-pagination">
    <span className="table-pagination-info">
      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
      {Math.min(
        currentPage * ITEMS_PER_PAGE,
        filteredTables.length
      )}{" "}
      of {filteredTables.length} tables
    </span>

    <div className="table-pagination-buttons">
      <button
        type="button"
        className="table-pagination-button"
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
            className="table-pagination-ellipsis"
            aria-hidden="true"
          >
            ...
          </span>
        ) : (
          <button
            key={page}
            type="button"
            className={`table-pagination-button ${
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
        className="table-pagination-button"
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
          className="table-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <section
            className="table-modal table-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="table-modal-title"
          >
            <div className="table-modal-heading">
              <div>
                <span className="table-eyebrow">
                  SEATING CONFIGURATION
                </span>

                <h2 id="table-modal-title">
                  {editingId ? "Edit Table" : "Add Table"}
                </h2>

                <p className="table-modal-subtitle">
                  {editingId
                    ? "Update the details of this restaurant table."
                    : "Add a table to a specific restaurant branch."}
                </p>
              </div>

              <button
                type="button"
                className="table-modal-close"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            {formError && (
              <div className="table-form-error" role="alert">
                <AlertCircle size={17} aria-hidden="true" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="table-form-grid">
                <label className="table-form-field">
                  <span>
                    Table Number{" "}
                    <span className="table-required">*</span>
                  </span>

                  <input
                    name="number"
                    value={form.number}
                    onChange={handleFormChange}
                    placeholder="e.g. T-09"
                    maxLength={20}
                    required
                    autoFocus
                  />
                </label>

                <label className="table-form-field">
                  <span>
                    Seating Capacity{" "}
                    <span className="table-required">*</span>
                  </span>

                  <input
                    name="capacity"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={form.capacity}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label className="table-form-field">
                  <span>
                    Location{" "}
                    <span className="table-required">*</span>
                  </span>

                  <select
                    name="location"
                    value={form.location}
                    onChange={handleFormChange}
                    required
                  >
                    {locations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="table-form-field">
                  <span>
                    Status{" "}
                    <span className="table-required">*</span>
                  </span>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    required
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="table-form-field table-form-field-full">
                  <span>
                    Branch{" "}
                    <span className="table-required">*</span>
                  </span>

                  {editingId ? (
                    <>
                      <input
                        value={formBranchName}
                        readOnly
                        aria-label="Table branch"
                      />

                      <small>
                        A table remains assigned to its original branch
                        when edited.
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
                            {branch.name ||
                              branch.branchName ||
                              branch.code ||
                              id}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </label>
              </div>

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
                  {saving ? (
                    <>
                      <LoaderCircle
                        size={16}
                        className="table-spin"
                        aria-hidden="true"
                      />
                      Saving...
                    </>
                  ) : editingId ? (
                    <>
                      <CheckCircle2 size={16} aria-hidden="true" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Plus size={17} aria-hidden="true" />
                      Add Table
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
          className="table-modal-backdrop table-confirm-backdrop"
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
            className="table-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="table-delete-title"
            aria-describedby="table-delete-description"
          >
            <div className="table-confirm-icon">
              <Trash2 size={23} aria-hidden="true" />
            </div>

            <h2 id="table-delete-title">Delete Table?</h2>

            <p id="table-delete-description">
              Are you sure you want to delete table{" "}
              <strong>{deletingItem.number}</strong>? This action
              cannot be undone.
            </p>

            <div className="table-confirm-actions">
              <button
                type="button"
                className="table-secondary-button"
                onClick={() => setDeletingItem(null)}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="table-danger-button"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <LoaderCircle
                      size={16}
                      className="table-spin"
                      aria-hidden="true"
                    />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} aria-hidden="true" />
                    Delete Table
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

export default TableManagement;
