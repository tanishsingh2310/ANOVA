import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../../services/api";
import "../../../styles/reservations.css";

const BRANCH_ID = "6ad0e90a53cc462cbaaec9fa";

const emptyForm = {
  customerName: "",
  phone: "",
  email: "",
  date: "",
  time: "",
  guests: 2,
  tableNumber: "",
  status: "Pending",
  occasion: "Regular Dining",
};

const statusOptions = [
  "Pending",
  "Confirmed",
  "Completed",
  "Cancelled",
];

function formatDate(dateString) {
  if (!dateString) return "—";

  return new Date(`${dateString}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
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

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeReservation(reservation) {
  return {
    ...reservation,
    id: reservation._id || reservation.id,
    email: reservation.email || "",
    guests: Number(reservation.guests),
    tableNumber: reservation.tableNumber || "Unassigned",
    status: reservation.status || "Pending",
    occasion: reservation.occasion || "Regular Dining",
  };
}

function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");

  const today = getToday();

  const loadReservations = useCallback(async () => {
    setIsLoading(true);
    setPageError("");

    try {
      const data = await apiRequest(
        `/api/reservations/${BRANCH_ID}`
      );

      if (!Array.isArray(data)) {
        throw new Error("The server returned an unexpected reservations response.");
      }

      setReservations(data.map(normalizeReservation));
    } catch (error) {
      setPageError(
        error.message || "Unable to load reservations. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const summary = useMemo(() => {
    return {
      total: reservations.length,
      pending: reservations.filter(
        (reservation) => reservation.status === "Pending"
      ).length,
      confirmed: reservations.filter(
        (reservation) => reservation.status === "Confirmed"
      ).length,
      cancelled: reservations.filter(
        (reservation) => reservation.status === "Cancelled"
      ).length,
    };
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return reservations
      .filter((reservation) => {
        const matchesSearch =
          (reservation.customerName || "").toLowerCase().includes(query) ||
          (reservation.phone || "").includes(query) ||
          (reservation.email || "").toLowerCase().includes(query) ||
          (reservation.tableNumber || "Unassigned")
            .toLowerCase()
            .includes(query);

        const matchesStatus =
          statusFilter === "All" ||
          reservation.status === statusFilter;

        const matchesDate =
          !dateFilter || reservation.date === dateFilter;

        return matchesSearch && matchesStatus && matchesDate;
      })
      .sort((a, b) => {
        const dateA = `${a.date}T${a.time}`;
        const dateB = `${b.date}T${b.time}`;

        return dateA.localeCompare(dateB);
      });
  }, [reservations, searchTerm, statusFilter, dateFilter]);

  function openAddModal() {
    setEditingId(null);
    setFormError("");
    setFormData({
      ...emptyForm,
      date: today,
    });
    setIsModalOpen(true);
  }

  function openEditModal(reservation) {
    setEditingId(reservation.id);
    setFormError("");

    setFormData({
      customerName: reservation.customerName,
      phone: reservation.phone,
      email: reservation.email || "",
      date: reservation.date,
      time: reservation.time,
      guests: reservation.guests,
      tableNumber:
        reservation.tableNumber === "Unassigned"
          ? ""
          : reservation.tableNumber,
      status: reservation.status,
      occasion: reservation.occasion,
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
      [name]: name === "guests" ? Number(value) : value,
    }));

    if (formError) {
      setFormError("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    if (!formData.customerName.trim() || !formData.phone.trim()) {
      setFormError("Please enter the guest's name and phone number.");
      return;
    }

  
const phone = formData.phone.trim();
const email = formData.email.trim();

// Phone: allow an optional +, spaces, hyphens and parentheses.
// Require 7–15 digits, with no other characters.
const phoneDigits = phone.replace(/\D/g, "");

const validPhone =
  /^\+?[0-9\s()-]+$/.test(phone) &&
  phoneDigits.length >= 7 &&
  phoneDigits.length <= 15 &&
  !/^[+]/.test(phone.slice(1)) &&
  !/\(\s*\)/.test(phone);

if (!validPhone) {
  setFormError(
    "Enter a valid phone number."
  );
  return;
}

// Email: validate its basic structure and reject malformed domains.
const emailParts = email.split("@");

const validEmail =
  email === "" ||
  (
    emailParts.length === 2 &&
    emailParts[0].length > 0 &&
    emailParts[0].length <= 64 &&
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(emailParts[0]) &&
    !emailParts[0].startsWith(".") &&
    !emailParts[0].endsWith(".") &&
    !emailParts[0].includes("..") &&
    emailParts[1].length <= 253 &&
    /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(emailParts[1]) &&
    emailParts[1].split(".").every(
      (label) =>
        label.length >= 1 &&
        label.length <= 63 &&
        !label.startsWith("-") &&
        !label.endsWith("-")
    )
  );

if (!validEmail) {
  setFormError("Enter a valid email address.");
  return;
}


    if (!formData.date || !formData.time) {
      setFormError("Please select a reservation date and time.");
      return;
    }

    if (formData.date < today) {
      setFormError("Please select today or a future date.");
      return;
    }

    if (
      !Number.isInteger(formData.guests) ||
      formData.guests < 1 ||
      formData.guests > 50
    ) {
      setFormError("Guest count must be between 1 and 50.");
      return;
    }

    const normalizedPhone = formData.phone.replace(/\D/g, "");

    const duplicatePhone = reservations.some(
      (reservation) =>
        String(reservation.id) !== String(editingId) &&
        reservation.phone.replace(/\D/g, "") === normalizedPhone &&
        reservation.date === formData.date &&
        reservation.time === formData.time &&
        !["Cancelled", "Completed"].includes(reservation.status) &&
        !["Cancelled", "Completed"].includes(formData.status)
    );

    if (duplicatePhone) {
      setFormError(
        "This phone number already has a reservation at the selected date and time."
      );
      return;
    }

    const normalizedTable = formData.tableNumber.trim().toUpperCase();

    const tableConflict =
      normalizedTable &&
      formData.status !== "Cancelled" &&
      formData.status !== "Completed" &&
      reservations.some(
        (reservation) =>
          String(reservation.id) !== String(editingId) &&
          reservation.tableNumber.toUpperCase() === normalizedTable &&
          reservation.date === formData.date &&
          reservation.time === formData.time &&
          !["Cancelled", "Completed"].includes(reservation.status)
      );

    if (tableConflict) {
      setFormError(
        "That table is already assigned to another reservation at this date and time."
      );
      return;
    }

    const reservationData = {
      customerName: formData.customerName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      date: formData.date,
      time: formData.time,
      guests: formData.guests,
      tableNumber: normalizedTable || "Unassigned",
      status: formData.status,
      occasion: formData.occasion,
    };

    setIsSaving(true);

    try {
      if (editingId !== null) {
        const updatedReservation = await apiRequest(
          `/api/reservations/${BRANCH_ID}/${editingId}`,
          {
            method: "PUT",
            body: JSON.stringify(reservationData),
          }
        );

        const normalizedUpdated = normalizeReservation(updatedReservation);

        setReservations((previous) =>
          previous.map((reservation) =>
            String(reservation.id) === String(editingId)
              ? normalizedUpdated
              : reservation
          )
        );
      } else {
        const createdReservation = await apiRequest(
          "/api/reservations",
          {
            method: "POST",
            body: JSON.stringify({
              ...reservationData,
              branchId: BRANCH_ID,
            }),
          }
        );

        setReservations((previous) => [
          ...previous,
          normalizeReservation(createdReservation),
        ]);
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData(emptyForm);
      setFormError("");
    } catch (error) {
      setFormError(
        error.message || "Unable to save the reservation. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(id, newStatus) {
    const reservation = reservations.find(
      (item) => String(item.id) === String(id)
    );

    if (!reservation) return;

    try {
      const updatedReservation = await apiRequest(
        `/api/reservations/${BRANCH_ID}/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const normalizedUpdated = normalizeReservation(updatedReservation);

      setReservations((previous) =>
        previous.map((item) =>
          String(item.id) === String(id) ? normalizedUpdated : item
        )
      );
    } catch (error) {
      window.alert(
        error.message || "Unable to update reservation status."
      );
    }
  }

  async function handleDelete(reservation) {
    const confirmed = window.confirm(
      `Delete the reservation for ${reservation.customerName}?`
    );

    if (!confirmed) return;

    try {
      await apiRequest(
        `/api/reservations/${BRANCH_ID}/${reservation.id}`,
        {
          method: "DELETE",
        }
      );

      setReservations((previous) =>
        previous.filter(
          (item) => String(item.id) !== String(reservation.id)
        )
      );
    } catch (error) {
      window.alert(
        error.message || "Unable to delete the reservation."
      );
    }
  }

  return (
    <section className="reservations-page">
      <div className="reservations-page-header">
        <div className="reservations-page-heading">
          <span className="reservations-eyebrow">
            RESTAURANT OPERATIONS
          </span>
          <h2>Reservations Management</h2>
          <p>
            Manage guest bookings, coordinate tables, and keep every
            dining experience organized.
          </p>
        </div>

        <button
          className="reservations-primary-button"
          type="button"
          onClick={openAddModal}
        >
          <span aria-hidden="true">+</span>
          New Reservation
        </button>
      </div>

      <div className="reservations-summary-grid">
        <SummaryCard
          icon="▤"
          label="Total Reservations"
          value={summary.total}
          type="total"
        />
        <SummaryCard
          icon="◷"
          label="Pending Requests"
          value={summary.pending}
          type="pending"
        />
        <SummaryCard
          icon="✓"
          label="Confirmed Bookings"
          value={summary.confirmed}
          type="confirmed"
        />
        <SummaryCard
          icon="×"
          label="Cancelled Bookings"
          value={summary.cancelled}
          type="cancelled"
        />
      </div>

      <div className="reservations-content-panel">
        <div className="reservations-content-header">
          <div>
            <h3>Guest Reservations</h3>
            <p>
              View and manage booking details for your restaurant.
            </p>
          </div>

          <span className="reservations-count">
            {filteredReservations.length}{" "}
            {filteredReservations.length === 1
              ? "reservation"
              : "reservations"}
          </span>
        </div>

        {pageError && (
          <div
            role="alert"
            style={{
              margin: "16px 0",
              padding: "12px 16px",
              border: "1px solid #e5b7b7",
              borderRadius: "8px",
              background: "#fff4f4",
              color: "#963b3b",
            }}
          >
            <p style={{ margin: "0 0 8px" }}>{pageError}</p>
            <button
              type="button"
              className="reservations-secondary-button"
              onClick={loadReservations}
            >
              Try Again
            </button>
          </div>
        )}

        <div className="reservations-toolbar">
          <div className="reservations-search">
            <span
              className="reservations-search-icon"
              aria-hidden="true"
            >
              ⌕
            </span>
            <input
              type="search"
              placeholder="Search guest, phone, email or table..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search reservations"
            />
          </div>

          <select
            className="reservations-filter"
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

          <input
            className="reservations-date-filter"
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            aria-label="Filter by reservation date"
          />

          {(searchTerm || statusFilter !== "All" || dateFilter) && (
            <button
              className="reservations-clear-button"
              type="button"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("All");
                setDateFilter("");
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="reservations-table-wrapper">
          <table className="reservations-table">
            <thead>
              <tr>
                <th>GUEST</th>
                <th>DATE &amp; TIME</th>
                <th>GUESTS</th>
                <th>TABLE</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6">
                    <div className="reservations-empty-state">
                      <h3>Loading reservations...</h3>
                      <p>Please wait while we retrieve your bookings.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredReservations.map((reservation) => (
                <tr key={reservation.id}>
                  <td>
                    <div className="reservation-guest">
                      <div className="reservation-avatar">
                        {reservation.customerName
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="reservation-guest-details">
                        <strong>{reservation.customerName}</strong>
                        <span>{reservation.phone}</span>
                        {reservation.email && (
                          <span>{reservation.email}</span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className="reservation-date-details">
                      <strong>{formatDate(reservation.date)}</strong>
                      <span>{formatTime(reservation.time)}</span>
                    </div>
                  </td>

                  <td>
                    <span className="reservation-guest-count">
                      ♙ {reservation.guests}
                    </span>
                  </td>

                  <td>
                    <span className="reservation-table-number">
                      {reservation.tableNumber}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`reservation-status-badge ${reservation.status.toLowerCase()}`}
                    >
                      {reservation.status}
                    </span>
                  </td>

                  <td>
                    <div className="reservation-actions">
                      <button
                        className="reservation-action-button"
                        type="button"
                        onClick={() => openEditModal(reservation)}
                        aria-label={`Edit reservation for ${reservation.customerName}`}
                      >
                        Edit
                      </button>
                      <button
                        className="reservation-action-button delete"
                        type="button"
                        onClick={() => handleDelete(reservation)}
                        aria-label={`Delete reservation for ${reservation.customerName}`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!isLoading && filteredReservations.length === 0 && (
                <tr>
                  <td colSpan="6">
                    <div className="reservations-empty-state">
                      <div className="reservations-empty-icon">▤</div>
                      <h3>No reservations found</h3>
                      <p>
                        Try changing your search or filters, or create a
                        new reservation.
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
          className="reservations-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            className="reservations-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reservation-modal-title"
          >
            <div className="reservations-modal-header">
              <div>
                <span className="reservations-eyebrow">
                  BOOKING DETAILS
                </span>
                <h3 id="reservation-modal-title">
                  {editingId !== null
                    ? "Edit Reservation"
                    : "Create Reservation"}
                </h3>
                <p>
                  Enter the guest and booking details below.
                </p>
              </div>

              <button
                className="reservations-modal-close"
                type="button"
                onClick={closeModal}
                aria-label="Close reservation form"
              >
                ×
              </button>
            </div>

            <form
              className="reservations-modal-form"
              onSubmit={handleSubmit}
            >
              <div className="reservations-form-group">
                <label htmlFor="customerName">Guest name *</label>
                <input
                  id="customerName"
                  name="customerName"
                  type="text"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="Enter guest's full name"
                  maxLength={80}
                  required
                />
              </div>

              <div className="reservations-form-row">
                <div className="reservations-form-group">
                  <label htmlFor="phone">Phone number *</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                    maxLength={18}
                    required
                  />
                </div>

                <div className="reservations-form-group">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="guest@example.com"
                    maxLength={120}
                  />
                </div>
              </div>

              <div className="reservations-form-row">
                <div className="reservations-form-group">
                  <label htmlFor="date">Reservation date *</label>
                  <input
                    id="date"
                    name="date"
                    type="date"
                    min={today}
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="reservations-form-group">
                  <label htmlFor="time">Reservation time *</label>
                  <input
                    id="time"
                    name="time"
                    type="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="reservations-form-row">
                <div className="reservations-form-group">
                  <label htmlFor="guests">Number of guests *</label>
                  <input
                    id="guests"
                    name="guests"
                    type="number"
                    min="1"
                    max="50"
                    value={formData.guests}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="reservations-form-group">
                  <label htmlFor="tableNumber">Assigned table</label>
                  <select
                    id="tableNumber"
                    name="tableNumber"
                    value={formData.tableNumber}
                    onChange={handleInputChange}
                  >
                    <option value="">Unassigned</option>
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
              </div>

              <div className="reservations-form-row">
                <div className="reservations-form-group">
                  <label htmlFor="occasion">Occasion</label>
                  <select
                    id="occasion"
                    name="occasion"
                    value={formData.occasion}
                    onChange={handleInputChange}
                  >
                    <option>Regular Dining</option>
                    <option>Birthday</option>
                    <option>Anniversary</option>
                    <option>Business Meeting</option>
                    <option>Family Dining</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="reservations-form-group">
                  <label htmlFor="status">Booking status</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formError && (
                <div
                  role="alert"
                  style={{
                    padding: "12px 14px",
                    border: "1px solid #e5b7b7",
                    borderRadius: "8px",
                    background: "#fff4f4",
                    color: "#963b3b",
                    fontSize: "0.9rem",
                  }}
                >
                  {formError}
                </div>
              )}

              <div className="reservations-modal-actions">
                <button
                  className="reservations-secondary-button"
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                >
                  Cancel
                </button>

                <button
                  className="reservations-primary-button"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving..."
                    : editingId !== null
                      ? "Save Changes"
                      : "Create Reservation"}
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
    <div className="reservations-summary-card">
      <div className={`reservations-summary-icon ${type}`}>
        {icon}
      </div>
      <div className="reservations-summary-info">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export default Reservations;