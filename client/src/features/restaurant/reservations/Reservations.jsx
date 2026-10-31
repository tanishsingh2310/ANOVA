
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
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { apiRequest } from "../../../services/api";
import "../../../styles/reservations.css";

const ALL_BRANCHES = "all";
const ITEMS_PER_PAGE = 10;

const emptyForm = {
  customerName: "",
  phone: "",
  email: "",
  date: "",
  time: "",
  guests: 2,
  branchId: "",
  tableNumber: "",
  status: "Pending",
  occasion: "Regular Dining",
};

const statusOptions = ["Pending", "Confirmed", "Completed", "Cancelled"];

function getToday() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(timeString) {
  if (!timeString) return "—";

  const [hours, minutes] = timeString.split(":");
  const date = new Date();

  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getReservationBranchId(reservation, fallbackBranchId = "") {
  const raw = reservation?.branchId ?? reservation?.branch;

  if (raw && typeof raw === "object") {
    return String(raw._id || raw.id || fallbackBranchId || "");
  }

  return String(raw || fallbackBranchId || "");
}

function normalizeReservation(reservation, fallbackBranchId = "") {
  const branchId = getReservationBranchId(reservation, fallbackBranchId);

  return {
    ...reservation,
    id: String(reservation?._id || reservation?.id || ""),
    branchId,
    customerName: reservation?.customerName || "",
    phone: reservation?.phone || "",
    email: reservation?.email || "",
    guests: Number(reservation?.guests || 0),
    tableNumber: reservation?.tableNumber || "Unassigned",
    status: reservation?.status || "Pending",
    occasion: reservation?.occasion || "Regular Dining",
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

/*
 * Supports common API response shapes:
 *   [ ... ]
 *   { data: [ ... ] }
 *   { tables: [ ... ] }
 *   { data: { tables: [ ... ] } }
 */
function extractTables(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.tables)) return response.tables;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.tables)) {
    return response.data.tables;
  }

  return [];
}

function getTableNumber(table) {
  const value =
    table?.tableNumber ??
    table?.number ??
    table?.name ??
    table?.tableName;

  if (value === undefined || value === null || value === "") {
    return "";
  }

  return String(value);
}

function getTableCapacity(table) {
  const capacity =
    table?.capacity ??
    table?.seatingCapacity ??
    table?.maxCapacity ??
    table?.seats;

  if (
    capacity === null ||
    capacity === undefined ||
    String(capacity).trim() === ""
  ) {
    return null;
  }

  const parsed = Number(capacity);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function Reservations({
  branchId = ALL_BRANCHES,
  branches = [],
  onBranchChange,
  branchLoading = false,
  branchError = "",
}) {
  const [reservations, setReservations] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingReservation, setDeletingReservation] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState("");

  // Each table is stored as { tableNumber, capacity }.
  const [branchTables, setBranchTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState("");

  const today = getToday();
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
          branch.name || branch.branchName || "Unnamed Branch"
        );
      }
    });

    return names;
  }, [branchOptions]);

  // Only show tables that can accommodate the current guest count.
  const suitableTables = useMemo(() => {
    const guestCount = Number(form.guests) || 1;

    return branchTables.filter(
      (table) =>
        table.capacity !== null &&
        table.capacity >= guestCount
    );
  }, [branchTables, form.guests]);

  const notify = useCallback((type, message) => {
    setNotice({
      type,
      message,
      id: `${Date.now()}-${Math.random()}`,
    });
  }, []);

  // Load reservations for the selected branch or all branches.
  useEffect(() => {
    let active = true;

    async function loadReservations() {
      setLoading(true);
      setLoadError("");

      try {
        if (branchLoading) return;
        if (branchError) throw new Error(branchError);

        if (selectedBranchId === ALL_BRANCHES) {
          if (!branchOptions.length) {
            if (active) setReservations([]);
            return;
          }

          const results = await Promise.all(
            branchOptions.map(async (branch) => {
              const id = String(branch?._id || branch?.id || "");

              if (!id) {
                throw new Error(
                  "A branch is missing its ID. Please refresh the branches."
                );
              }

              const data = await apiRequest(`/api/reservations/${id}`);

              if (!Array.isArray(data)) {
                throw new Error(
                  `The server returned an invalid reservations response for ${
                    branch.name || branch.branchName || id
                  }.`
                );
              }

              return data.map((item) => normalizeReservation(item, id));
            })
          );

          if (active) {
            const unique = new Map();

            results.flat().forEach((item) => {
              if (!item.id) return;

              unique.set(item.id, {
                ...unique.get(item.id),
                ...item,
              });
            });

            setReservations(Array.from(unique.values()));
          }
        } else {
          const data = await apiRequest(
            `/api/reservations/${selectedBranchId}`
          );

          if (!Array.isArray(data)) {
            throw new Error(
              "The server returned an invalid reservations response."
            );
          }

          if (active) {
            setReservations(
              data.map((item) =>
                normalizeReservation(item, selectedBranchId)
              )
            );
          }
        }
      } catch (error) {
        if (active) {
          setReservations([]);
          setLoadError(
            getErrorMessage(error, "Unable to load reservations.")
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReservations();

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

  // Load tables for the branch selected in the reservation form.
  useEffect(() => {
    let active = true;

    async function loadBranchTables() {
      const id = String(form.branchId || "");

      setBranchTables([]);
      setTablesError("");

      if (!showForm || !id || id === ALL_BRANCHES) {
        setTablesLoading(false);
        return;
      }

      setTablesLoading(true);

      try {
        const response = await apiRequest(`/api/tables/${id}`);
        const data = extractTables(response);

        const normalizedTables = data
          .map((table) => {
            const tableNumber = getTableNumber(table);
            const capacity = getTableCapacity(table);

            if (!tableNumber) return null;

            return {
              tableNumber,
              capacity,
            };
          })
          .filter(Boolean);

        const uniqueTables = Array.from(
          new Map(
            normalizedTables.map((table) => [
              table.tableNumber,
              table,
            ])
          ).values()
        ).sort((a, b) =>
          a.tableNumber.localeCompare(b.tableNumber, undefined, {
            numeric: true,
            sensitivity: "base",
          })
        );

        if (active) {
          setBranchTables(uniqueTables);
        }
      } catch (error) {
        if (active) {
          setBranchTables([]);
          setTablesError(
            getErrorMessage(
              error,
              "Unable to load tables for this branch."
            )
          );
        }
      } finally {
        if (active) setTablesLoading(false);
      }
    }

    loadBranchTables();

    return () => {
      active = false;
    };
  }, [form.branchId, showForm]);

  // Clear a selected table if it cannot accommodate the current guest count.
  useEffect(() => {
    if (!form.tableNumber || tablesLoading || tablesError) return;

    const selectedTable = branchTables.find(
      (table) =>
        table.tableNumber.toUpperCase() ===
        String(form.tableNumber).trim().toUpperCase()
    );

    if (
      selectedTable &&
      (selectedTable.capacity === null ||
        selectedTable.capacity < Number(form.guests))
    ) {
      setForm((current) => ({
        ...current,
        tableNumber: "",
      }));
    }
  }, [
    form.tableNumber,
    form.guests,
    branchTables,
    tablesLoading,
    tablesError,
  ]);

  useEffect(() => {
    setSearch("");
    setStatusFilter("All");
    setDateFilter("");
    setCurrentPage(1);
  }, [selectedBranchId]);

  const filteredReservations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reservations
      .filter((reservation) => {
        const matchesSearch =
          String(reservation.customerName || "")
            .toLowerCase()
            .includes(query) ||
          String(reservation.phone || "").includes(query) ||
          String(reservation.email || "")
            .toLowerCase()
            .includes(query) ||
          String(reservation.tableNumber || "Unassigned")
            .toLowerCase()
            .includes(query);

        return (
          matchesSearch &&
          (statusFilter === "All" ||
            reservation.status === statusFilter) &&
          (!dateFilter || reservation.date === dateFilter)
        );
      })
      .sort((a, b) =>
        `${a.date || ""}T${a.time || ""}`.localeCompare(
          `${b.date || ""}T${b.time || ""}`
        )
      );
  }, [reservations, search, statusFilter, dateFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, dateFilter, selectedBranchId]);

  const totalPages = Math.ceil(
    filteredReservations.length / ITEMS_PER_PAGE
  );

  const paginationPages = getPaginationPages(currentPage, totalPages);

  const paginatedReservations = filteredReservations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const currentBranchLabel =
    selectedBranchId === ALL_BRANCHES
      ? "All Branches"
      : branchNames.get(selectedBranchId) || "Selected Branch";

  function refreshReservations() {
    setNotice(null);
    setRefreshKey((current) => current + 1);
  }

  function openAddForm() {
    setEditingId(null);
    setFormError("");
    setNotice(null);
    setTablesError("");

    setForm({
      ...emptyForm,
      date: today,
      branchId:
        selectedBranchId !== ALL_BRANCHES ? selectedBranchId : "",
    });

    setShowForm(true);
  }

  function openEditForm(reservation) {
    setEditingId(reservation.id);
    setFormError("");
    setNotice(null);
    setTablesError("");

    setForm({
      customerName: reservation.customerName || "",
      phone: reservation.phone || "",
      email: reservation.email || "",
      date: reservation.date || "",
      time: reservation.time || "",
      guests: reservation.guests || 2,
      branchId: reservation.branchId || "",
      tableNumber:
        reservation.tableNumber === "Unassigned"
          ? ""
          : reservation.tableNumber || "",
      status: reservation.status || "Pending",
      occasion: reservation.occasion || "Regular Dining",
    });

    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setTablesError("");
    setBranchTables([]);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;

    if (name === "branchId") {
      setForm((current) => ({
        ...current,
        branchId: value,
        tableNumber: "",
      }));

      setBranchTables([]);
      setTablesError("");
      setFormError("");
      return;
    }

    if (name === "guests") {
      const guests = value === "" ? "" : Number(value);

      setForm((current) => {
        const selectedTable = branchTables.find(
          (table) =>
            table.tableNumber.toUpperCase() ===
            String(current.tableNumber).trim().toUpperCase()
        );

        const tableIsTooSmall =
          selectedTable &&
          (selectedTable.capacity === null ||
            selectedTable.capacity < Number(guests));

        return {
          ...current,
          guests,
          tableNumber: tableIsTooSmall ? "" : current.tableNumber,
        };
      });
    } else {
      setForm((current) => ({
        ...current,
        [name]: value,
      }));
    }

    if (formError) setFormError("");
  }

  function validatePhone(phone) {
    const digits = phone.replace(/\D/g, "");

    return (
      /^\+?[0-9\s()-]+$/.test(phone) &&
      digits.length >= 7 &&
      digits.length <= 15 &&
      !/\(\s*\)/.test(phone) &&
      !/\+\s*\+/.test(phone)
    );
  }

  function validateEmail(email) {
    if (!email) return true;

    const parts = email.split("@");
    if (parts.length !== 2) return false;

    const [local, domain] = parts;

    return (
      local.length > 0 &&
      local.length <= 64 &&
      /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) &&
      !local.startsWith(".") &&
      !local.endsWith(".") &&
      !local.includes("..") &&
      domain.length <= 253 &&
      /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(domain) &&
      domain.split(".").every(
        (label) =>
          label.length >= 1 &&
          label.length <= 63 &&
          !label.startsWith("-") &&
          !label.endsWith("-")
      )
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    setFormError("");

    const selectedBranch = branchOptions.find(
      (branch) =>
        String(branch._id || branch.id) === String(form.branchId)
    );

    if (
      !form.branchId ||
      form.branchId === ALL_BRANCHES ||
      !selectedBranch
    ) {
      setFormError("Please select a valid branch.");
      return;
    }

    if (!form.customerName.trim() || !form.phone.trim()) {
      setFormError("Please enter the guest's name and phone number.");
      return;
    }

    const phone = form.phone.trim();
    const email = form.email.trim();

    if (!validatePhone(phone)) {
      setFormError("Enter a valid phone number.");
      return;
    }

    if (!validateEmail(email)) {
      setFormError("Enter a valid email address.");
      return;
    }

    if (!form.date || !form.time) {
      setFormError("Please select a reservation date and time.");
      return;
    }

    if (form.date < today) {
      setFormError("Please select today or a future date.");
      return;
    }

    if (
      !Number.isInteger(form.guests) ||
      form.guests < 1 ||
      form.guests > 50
    ) {
      setFormError("Guest count must be between 1 and 50.");
      return;
    }

    const normalizedPhone = phone.replace(/\D/g, "");
    const activeStatuses = ["Pending", "Confirmed"];

    const duplicatePhone = reservations.some(
      (reservation) =>
        String(reservation.id) !== String(editingId) &&
        String(reservation.branchId) === String(form.branchId) &&
        String(reservation.phone || "").replace(/\D/g, "") ===
          normalizedPhone &&
        reservation.date === form.date &&
        reservation.time === form.time &&
        activeStatuses.includes(reservation.status) &&
        activeStatuses.includes(form.status)
    );

    if (duplicatePhone) {
      setFormError(
        "This phone number already has a reservation at the selected date and time."
      );
      return;
    }

    const normalizedTable = String(form.tableNumber || "")
      .trim()
      .toUpperCase();

    const tableConflict =
      normalizedTable &&
      activeStatuses.includes(form.status) &&
      reservations.some(
        (reservation) =>
          String(reservation.id) !== String(editingId) &&
          String(reservation.branchId) === String(form.branchId) &&
          String(reservation.tableNumber || "")
            .trim()
            .toUpperCase() === normalizedTable &&
          reservation.date === form.date &&
          reservation.time === form.time &&
          activeStatuses.includes(reservation.status)
      );

    if (tableConflict) {
      setFormError(
        "That table is already assigned to another reservation at this branch, date and time."
      );
      return;
    }

    // Validate both branch membership and seating capacity.
    if (normalizedTable) {
      const selectedTable = branchTables.find(
        (table) =>
          table.tableNumber.trim().toUpperCase() === normalizedTable
      );

      if (!selectedTable) {
        setFormError(
          "Please select a valid table for the selected branch, or choose Unassigned."
        );
        return;
      }

      if (
        selectedTable.capacity === null ||
        selectedTable.capacity < form.guests
      ) {
        setFormError(
          `The selected table cannot accommodate ${form.guests} guests. Please choose a larger table.`
        );
        return;
      }
    }

    const reservationData = {
      customerName: form.customerName.trim(),
      phone,
      email,
      date: form.date,
      time: form.time,
      guests: form.guests,
      branchId: form.branchId,
      tableNumber: normalizedTable || "Unassigned",
      status: form.status,
      occasion: form.occasion,
    };

    setSaving(true);
    setNotice(null);

    try {
      if (editingId !== null) {
        const existing = reservations.find(
          (item) => String(item.id) === String(editingId)
        );

        const targetBranchId = existing?.branchId || form.branchId;

        if (!targetBranchId || targetBranchId === ALL_BRANCHES) {
          throw new Error(
            "The reservation's branch could not be identified."
          );
        }

        const updated = await apiRequest(
          `/api/reservations/${targetBranchId}/${editingId}`,
          {
            method: "PUT",
            body: JSON.stringify(reservationData),
          }
        );

        const normalized = normalizeReservation(updated, targetBranchId);

        setReservations((current) =>
          current.map((item) =>
            String(item.id) === String(editingId) ? normalized : item
          )
        );

        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);

        notify("success", "Reservation updated successfully.");
      } else {
        const created = await apiRequest("/api/reservations", {
          method: "POST",
          body: JSON.stringify(reservationData),
        });

        const normalized = normalizeReservation(created, form.branchId);

        setReservations((current) => [
          normalized,
          ...current.filter(
            (item) => String(item.id) !== String(normalized.id)
          ),
        ]);

        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);

        notify("success", "Reservation created successfully.");
      }

      setRefreshKey((current) => current + 1);
    } catch (error) {
      setFormError(
        getErrorMessage(error, "Unable to save the reservation.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deletingReservation || deleting) return;

    const reservation = deletingReservation;

    if (
      !reservation.branchId ||
      reservation.branchId === ALL_BRANCHES ||
      !reservation.id
    ) {
      notify(
        "error",
        "The reservation's branch or ID could not be identified."
      );
      return;
    }

    setDeleting(true);
    setNotice(null);

    try {
      await apiRequest(
        `/api/reservations/${reservation.branchId}/${reservation.id}`,
        { method: "DELETE" }
      );

      setReservations((current) =>
        current.filter(
          (item) => String(item.id) !== String(reservation.id)
        )
      );

      setDeletingReservation(null);

      notify(
        "success",
        `Reservation for ${
          reservation.customerName || "the guest"
        } deleted successfully.`
      );
    } catch (error) {
      notify(
        "error",
        getErrorMessage(error, "Unable to delete the reservation.")
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="reservations-management">
      <div className="reservations-page-heading">
        <div className="reservations-page-heading-copy">
          <p>
            Manage guest bookings, coordinate tables, and keep every dining
            experience organized.
          </p>
        </div>

        <div className="reservations-header-actions">
          <button
            type="button"
            className="reservations-primary-button"
            onClick={openAddForm}
            disabled={branchLoading || branchOptions.length === 0}
          >
            <Plus size={17} aria-hidden="true" />
            New Reservation
          </button>

          <button
            type="button"
            className="reservations-secondary-button reservations-refresh-button"
            onClick={refreshReservations}
            disabled={loading || branchLoading}
          >
            <RefreshCw
              size={15}
              className={loading ? "reservations-spin" : ""}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`reservations-notice reservations-notice-${notice.type}`}
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
            className="reservations-notice-close"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="reservations-filter-card">
        <div className="reservations-toolbar">
          <label className="reservations-search">
            <Search size={17} aria-hidden="true" />

            <input
              type="search"
              placeholder="Search guest, phone, email or table..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search reservations"
            />

            {search && (
              <button
                type="button"
                className="reservations-search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </label>

          <label className="reservations-filter">
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
              <small className="reservations-filter-error" role="alert">
                {branchError}
              </small>
            )}
          </label>

          <label className="reservations-filter">
            <span>Status</span>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
            >
              <option value="All">All statuses</option>

              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="reservations-filter">
            <span>Reservation date</span>

            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              aria-label="Filter by reservation date"
            />
          </label>
        </div>
      </div>

      <div className="reservations-table-container">
        <div className="reservations-table-heading">
          <div>
            <h2>Guest Reservations</h2>

            <p>
              {loading
                ? "Loading reservations..."
                : loadError
                  ? "Reservations could not be loaded"
                  : `${filteredReservations.length} ${
                      filteredReservations.length === 1
                        ? "reservation"
                        : "reservations"
                    } found`}
            </p>
          </div>

          <span className="reservations-current-branch">
            {currentBranchLabel}
          </span>
        </div>

        {loadError && (
          <div className="reservations-inline-error" role="alert">
            <AlertCircle size={18} />
            <span>{loadError}</span>

            <button
              type="button"
              className="reservations-secondary-button"
              onClick={refreshReservations}
            >
              <RefreshCw size={14} /> Try Again
            </button>
          </div>
        )}

        <div className="reservations-table-scroll">
          <table className="reservations-table">
            <colgroup>
              <col className="reservations-col-guest" />
              <col className="reservations-col-branch" />
              <col className="reservations-col-date" />
              <col className="reservations-col-guests" />
              <col className="reservations-col-table" />
              <col className="reservations-col-status" />
              <col className="reservations-col-actions" />
            </colgroup>

            <thead>
              <tr>
                <th scope="col">Guest</th>
                <th scope="col">Branch</th>
                <th scope="col">Date &amp; Time</th>
                <th scope="col">Guests</th>
                <th scope="col">Table</th>
                <th scope="col">Status</th>
                <th scope="col" className="reservations-actions-heading">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading || branchLoading ? (
                <tr>
                  <td colSpan={7} className="reservations-state-cell">
                    <div className="reservations-loading-state">
                      <LoaderCircle
                        size={25}
                        className="reservations-spin"
                        aria-hidden="true"
                      />

                      <strong>
                        {branchLoading
                          ? "Loading branches"
                          : "Loading reservations"}
                      </strong>

                      <span>
                        Please wait while we retrieve your bookings.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : loadError || branchError ? (
                <tr>
                  <td colSpan={7} className="reservations-state-cell">
                    <div className="reservations-error-state">
                      <AlertCircle size={26} aria-hidden="true" />
                      <strong>Unable to load reservations</strong>
                      <p>{loadError || branchError}</p>

                      <button
                        type="button"
                        className="reservations-secondary-button"
                        onClick={refreshReservations}
                      >
                        <RefreshCw size={14} /> Try Again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : !branchOptions.length ? (
                <tr>
                  <td colSpan={7} className="reservations-state-cell">
                    <div className="reservations-empty-state">
                      <strong>No branches available</strong>
                      <p>
                        Create or load a branch before managing reservations.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="reservations-state-cell">
                    <div className="reservations-empty-state">
                      <div className="reservations-empty-icon">
                        <Search size={23} />
                      </div>

                      <strong>
                        {reservations.length
                          ? "No matching reservations"
                          : "No reservations yet"}
                      </strong>

                      <p>
                        {reservations.length
                          ? "Try another search term or adjust your filters."
                          : "Create a reservation to get started."}
                      </p>

                      {!reservations.length && (
                        <button
                          type="button"
                          className="reservations-primary-button"
                          onClick={openAddForm}
                        >
                          <Plus size={16} /> New Reservation
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedReservations.map((reservation) => {
                  const initials =
                    reservation.customerName
                      .trim()
                      .split(/\s+/)
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "?";

                  return (
                    <tr key={reservation.id}>
                      <td>
                        <div className="reservations-guest-cell">
                          <div
                            className="reservations-guest-avatar"
                            aria-hidden="true"
                          >
                            {initials}
                          </div>

                          <div className="reservations-guest-copy">
                            <strong>
                              {reservation.customerName || "Unnamed guest"}
                            </strong>

                            <span>
                              {reservation.phone || "No phone number"}
                            </span>

                            {reservation.email && (
                              <span>{reservation.email}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="reservations-branch-name">
                          {branchNames.get(String(reservation.branchId)) ||
                            "Unknown Branch"}
                        </span>
                      </td>

                      <td>
                        <div className="reservations-date-cell">
                          <strong>{formatDate(reservation.date)}</strong>

                          <span>
                            <Clock3 size={12} aria-hidden="true" />
                            {formatTime(reservation.time)}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="reservations-guest-count">
                          <Users size={14} aria-hidden="true" />
                          {reservation.guests}
                        </span>
                      </td>

                      <td>
                        <span className="reservations-table-number">
                          {reservation.tableNumber}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`reservations-status-badge ${String(
                            reservation.status
                          ).toLowerCase()}`}
                        >
                          {reservation.status}
                        </span>
                      </td>

                      <td>
                        <div className="reservations-row-actions">
                          <button
                            type="button"
                            className="reservations-action-button"
                            onClick={() => openEditForm(reservation)}
                            disabled={deleting || saving}
                            aria-label={`Edit reservation for ${reservation.customerName}`}
                            title="Edit reservation"
                          >
                            <Pencil size={14} aria-hidden="true" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            className="reservations-action-button reservations-delete-button"
                            onClick={() =>
                              setDeletingReservation(reservation)
                            }
                            disabled={deleting || saving}
                            aria-label={`Delete reservation for ${reservation.customerName}`}
                            title="Delete reservation"
                          >
                            <Trash2 size={14} aria-hidden="true" />
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
        <div className="reservations-pagination">
          <span className="reservations-pagination-info">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(
              currentPage * ITEMS_PER_PAGE,
              filteredReservations.length
            )}{" "}
            of {filteredReservations.length} reservations
          </span>

          <div className="reservations-pagination-buttons">
            <button
              type="button"
              className="reservations-pagination-button"
              disabled={currentPage === 1}
              onClick={() =>
                setCurrentPage((page) => Math.max(1, page - 1))
              }
            >
              <ChevronLeft size={16} /> Previous
            </button>

            {paginationPages.map((page, index) =>
              page === "..." ? (
                <span
                  key={`ellipsis-${index}`}
                  className="reservations-pagination-ellipsis"
                  aria-hidden="true"
                >
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  className={`reservations-pagination-button ${
                    currentPage === page ? "active" : ""
                  }`}
                  onClick={() => setCurrentPage(page)}
                  aria-current={currentPage === page ? "page" : undefined}
                >
                  {page}
                </button>
              )
            )}

            <button
              type="button"
              className="reservations-pagination-button"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((page) =>
                  Math.min(totalPages, page + 1)
                )
              }
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div
          className="reservations-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            className="reservations-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reservation-modal-title"
          >
            <div className="reservations-modal-heading">
              <div>
                <span className="reservations-eyebrow">
                  BOOKING DETAILS
                </span>

                <h2 id="reservation-modal-title">
                  {editingId !== null
                    ? "Edit Reservation"
                    : "New Reservation"}
                </h2>

                <p>
                  {editingId !== null
                    ? "Update the guest and booking details."
                    : "Add guest and booking details for a branch."}
                </p>
              </div>

              <button
                type="button"
                className="reservations-modal-close"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            {formError && (
              <div className="reservations-form-error" role="alert">
                <AlertCircle size={17} />
                <span>{formError}</span>
              </div>
            )}

            <form
              className="reservations-modal-form"
              onSubmit={handleSubmit}
            >
              <div className="reservations-form-grid">
                <label className="reservations-form-field">
                  <span>
                    Branch <b>*</b>
                  </span>

                  <select
                    name="branchId"
                    value={form.branchId}
                    onChange={handleFormChange}
                    required
                    disabled={editingId !== null || saving}
                  >
                    <option value="">Select branch</option>

                    {branchOptions.map((branch) => {
                      const id = String(branch._id || branch.id);

                      return (
                        <option key={id} value={id}>
                          {branch.name || branch.branchName || id}
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label className="reservations-form-field">
                  <span>
                    Guest name <b>*</b>
                  </span>

                  <input
                    name="customerName"
                    value={form.customerName}
                    onChange={handleFormChange}
                    placeholder="Enter guest's full name"
                    maxLength={80}
                    required
                    autoFocus
                    disabled={saving}
                  />
                </label>

                <label className="reservations-form-field">
                  <span>
                    Phone number <b>*</b>
                  </span>

                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleFormChange}
                    placeholder="Enter phone number"
                    maxLength={18}
                    required
                    disabled={saving}
                  />
                </label>

                <label className="reservations-form-field">
                  <span>Email address</span>

                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleFormChange}
                    placeholder="guest@example.com"
                    maxLength={120}
                    disabled={saving}
                  />
                </label>

                <label className="reservations-form-field">
                  <span>
                    Reservation date <b>*</b>
                  </span>

                  <input
                    name="date"
                    type="date"
                    min={today}
                    value={form.date}
                    onChange={handleFormChange}
                    required
                    disabled={saving}
                  />
                </label>

                <label className="reservations-form-field">
                  <span>
                    Reservation time <b>*</b>
                  </span>

                  <input
                    name="time"
                    type="time"
                    value={form.time}
                    onChange={handleFormChange}
                    required
                    disabled={saving}
                  />
                </label>

                <label className="reservations-form-field">
                  <span>
                    Number of guests <b>*</b>
                  </span>

                  <input
                    name="guests"
                    type="number"
                    min="1"
                    max="50"
                    value={form.guests}
                    onChange={handleFormChange}
                    required
                    disabled={saving}
                  />
                </label>

                <label className="reservations-form-field">
                  <span>Assigned table</span>

                  <select
                    name="tableNumber"
                    value={form.tableNumber}
                    onChange={handleFormChange}
                    disabled={
                      saving ||
                      !form.branchId ||
                      tablesLoading ||
                      Boolean(tablesError)
                    }
                  >
                    <option value="">
                      {!form.branchId
                        ? "Select a branch first"
                        : tablesLoading
                          ? "Loading tables..."
                          : tablesError
                            ? "Tables unavailable"
                            : suitableTables.length
                              ? "Unassigned"
                              : `No tables for ${form.guests || 1} guests`}
                    </option>

                    {suitableTables.map((table) => (
                      <option
                        key={table.tableNumber}
                        value={table.tableNumber}
                      >
                        {table.tableNumber} — Capacity {table.capacity}
                      </option>
                    ))}
                  </select>

                  {tablesLoading && (
                    <small>Loading tables for the selected branch...</small>
                  )}

                  {tablesError && (
                    <small
                      className="reservations-filter-error"
                      role="alert"
                    >
                      {tablesError}
                    </small>
                  )}

                  {!tablesLoading &&
                    !tablesError &&
                    form.branchId &&
                    suitableTables.length === 0 && (
                      <small>
                        No tables have a recorded capacity for{" "}
                        {form.guests || 1} guests.
                      </small>
                    )}
                </label>

                <label className="reservations-form-field">
                  <span>Occasion</span>

                  <select
                    name="occasion"
                    value={form.occasion}
                    onChange={handleFormChange}
                    disabled={saving}
                  >
                    {[
                      "Regular Dining",
                      "Birthday",
                      "Anniversary",
                      "Business Meeting",
                      "Family Dining",
                      "Other",
                    ].map((occasion) => (
                      <option key={occasion} value={occasion}>
                        {occasion}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="reservations-form-field">
                  <span>Booking status</span>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    disabled={saving}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="reservations-modal-actions">
                <button
                  type="button"
                  className="reservations-secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="reservations-primary-button"
                  disabled={saving || tablesLoading}
                >
                  {saving ? (
                    <>
                      <LoaderCircle
                        size={16}
                        className="reservations-spin"
                      />
                      Saving...
                    </>
                  ) : editingId !== null ? (
                    <>
                      <CheckCircle2 size={16} />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Create Reservation
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deletingReservation && (
        <div
          className="reservations-modal-backdrop reservations-confirm-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !deleting
            ) {
              setDeletingReservation(null);
            }
          }}
        >
          <section
            className="reservations-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reservation-delete-title"
            aria-describedby="reservation-delete-description"
          >
            <div className="reservations-confirm-icon">
              <Trash2 size={23} aria-hidden="true" />
            </div>

            <h2 id="reservation-delete-title">
              Delete Reservation?
            </h2>

            <p id="reservation-delete-description">
              Delete the reservation for{" "}
              <strong>
                {deletingReservation.customerName || "this guest"}
              </strong>
              ? This action cannot be undone.
            </p>

            <div className="reservations-confirm-actions">
              <button
                type="button"
                className="reservations-secondary-button"
                onClick={() => setDeletingReservation(null)}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="reservations-danger-button"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <LoaderCircle
                      size={16}
                      className="reservations-spin"
                    />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    Delete Reservation
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

export default Reservations;
