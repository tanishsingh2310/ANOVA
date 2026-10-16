import { useMemo, useState } from "react";
import "../../styles/reservations.css";

const initialReservations = [
  {
    id: 1,
    customerName: "Aarav Shah",
    phone: "9876543210",
    email: "aarav@example.com",
    date: "2026-10-14",
    time: "19:00",
    guests: 4,
    tableNumber: "T-04",
    status: "Confirmed",
    occasion: "Birthday",
  },
  {
    id: 2,
    customerName: "Diya Patel",
    phone: "9876501234",
    email: "diya@example.com",
    date: "2026-10-14",
    time: "20:00",
    guests: 2,
    tableNumber: "T-02",
    status: "Pending",
    occasion: "Anniversary",
  },
  {
    id: 3,
    customerName: "Rohan Mehta",
    phone: "9812345670",
    email: "rohan@example.com",
    date: "2026-10-15",
    time: "13:00",
    guests: 6,
    tableNumber: "T-06",
    status: "Confirmed",
    occasion: "Family Dining",
  },
  {
    id: 4,
    customerName: "Ananya Desai",
    phone: "9898765432",
    email: "ananya@example.com",
    date: "2026-10-15",
    time: "19:30",
    guests: 3,
    tableNumber: "T-03",
    status: "Pending",
    occasion: "Regular Dining",
  },
  {
    id: 5,
    customerName: "Vivaan Joshi",
    phone: "9823456710",
    email: "vivaan@example.com",
    date: "2026-10-13",
    time: "20:30",
    guests: 5,
    tableNumber: "T-05",
    status: "Completed",
    occasion: "Family Dining",
  },
  {
    id: 6,
    customerName: "Myra Trivedi",
    phone: "9901234567",
    email: "myra@example.com",
    date: "2026-10-16",
    time: "12:30",
    guests: 2,
    tableNumber: "Unassigned",
    status: "Cancelled",
    occasion: "Regular Dining",
  },
];

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

function Reservations() {
  const [reservations, setReservations] = useState(
    initialReservations
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const today = new Date().toLocaleDateString("en-CA");

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
          reservation.customerName.toLowerCase().includes(query) ||
          reservation.phone.includes(query) ||
          reservation.email.toLowerCase().includes(query) ||
          reservation.tableNumber.toLowerCase().includes(query);

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
    setFormData({
      ...emptyForm,
      date: today,
    });
    setIsModalOpen(true);
  }

  function openEditModal(reservation) {
    setEditingId(reservation.id);
    setFormData({
      customerName: reservation.customerName,
      phone: reservation.phone,
      email: reservation.email,
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
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: name === "guests" ? Number(value) : value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!formData.customerName.trim() || !formData.phone.trim()) {
      window.alert("Please enter the customer's name and phone number.");
      return;
    }

    if (!/^\+?[0-9\s()-]{7,18}$/.test(formData.phone.trim())) {
      window.alert("Please enter a valid phone number.");
      return;
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      window.alert("Please enter a valid email address.");
      return;
    }

    if (!formData.date || !formData.time) {
      window.alert("Please select a reservation date and time.");
      return;
    }

    if (formData.date < today) {
      window.alert("Please select today or a future date.");
      return;
    }

    if (!Number.isInteger(formData.guests) || formData.guests < 1 || formData.guests > 50) {
      window.alert("Guest count must be between 1 and 50.");
      return;
    }

    const normalizedPhone = formData.phone.replace(/\D/g, "");

    const duplicatePhone = reservations.some(
      (reservation) =>
        reservation.id !== editingId &&
        reservation.phone.replace(/\D/g, "") === normalizedPhone &&
        reservation.date === formData.date &&
        reservation.time === formData.time &&
        reservation.status !== "Cancelled"
    );

    if (duplicatePhone) {
      window.alert(
        "This phone number already has a reservation at the selected date and time."
      );
      return;
    }

    const normalizedTable = formData.tableNumber.trim();

    const tableConflict =
      normalizedTable &&
      formData.status !== "Cancelled" &&
      formData.status !== "Completed" &&
      reservations.some(
        (reservation) =>
          reservation.id !== editingId &&
          reservation.tableNumber.toLowerCase() ===
            normalizedTable.toLowerCase() &&
          reservation.date === formData.date &&
          reservation.time === formData.time &&
          reservation.status !== "Cancelled" &&
          reservation.status !== "Completed"
      );

    if (tableConflict) {
      window.alert(
        "That table is already assigned to another reservation at this date and time."
      );
      return;
    }

    const reservationData = {
      ...formData,
      customerName: formData.customerName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      tableNumber: normalizedTable || "Unassigned",
    };

    if (editingId !== null) {
      setReservations((previous) =>
        previous.map((reservation) =>
          reservation.id === editingId
            ? { ...reservation, ...reservationData }
            : reservation
        )
      );
    } else {
      setReservations((previous) => [
        ...previous,
        {
          id: Date.now(),
          ...reservationData,
        },
      ]);
    }

    closeModal();
  }

  function handleStatusChange(id, newStatus) {
    setReservations((previous) =>
      previous.map((reservation) =>
        reservation.id === id
          ? { ...reservation, status: newStatus }
          : reservation
      )
    );
  }

  function handleDelete(reservation) {
    const confirmed = window.confirm(
      `Delete the reservation for ${reservation.customerName}?`
    );

    if (!confirmed) return;

    setReservations((previous) =>
      previous.filter((item) => item.id !== reservation.id)
    );
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
              {filteredReservations.map((reservation) => (
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

              {filteredReservations.length === 0 && (
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

              <div className="reservations-modal-actions">
                <button
                  className="reservations-secondary-button"
                  type="button"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  className="reservations-primary-button"
                  type="submit"
                >
                  {editingId !== null
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