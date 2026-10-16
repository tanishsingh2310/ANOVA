import { useMemo, useState } from "react";
import "../../styles/table-management.css";

const initialTables = [
  { id: 1, number: "T-01", capacity: 2, location: "Indoor", status: "Available" },
  { id: 2, number: "T-02", capacity: 4, location: "Indoor", status: "Occupied" },
  { id: 3, number: "T-03", capacity: 4, location: "Indoor", status: "Available" },
  { id: 4, number: "T-04", capacity: 6, location: "Outdoor", status: "Reserved" },
  { id: 5, number: "T-05", capacity: 2, location: "Outdoor", status: "Available" },
  { id: 6, number: "T-06", capacity: 8, location: "Private Dining", status: "Occupied" },
  { id: 7, number: "T-07", capacity: 4, location: "Outdoor", status: "Available" },
  { id: 8, number: "T-08", capacity: 6, location: "Private Dining", status: "Reserved" },
];

const emptyForm = {
  number: "",
  capacity: "2",
  location: "Indoor",
  status: "Available",
};

const statuses = ["Available", "Occupied", "Reserved"];
const locations = ["Indoor", "Outdoor", "Private Dining"];

function TableManagement() {
  const [tables, setTables] = useState(initialTables);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      const matchesSearch = table.number
        .toLowerCase()
        .includes(search.trim().toLowerCase());

      const matchesStatus =
        statusFilter === "All Statuses" || table.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tables, search, statusFilter]);

  const availableCount = tables.filter(
    (table) => table.status === "Available"
  ).length;

  const occupiedCount = tables.filter(
    (table) => table.status === "Occupied"
  ).length;

  const reservedCount = tables.filter(
    (table) => table.status === "Reserved"
  ).length;

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(table) {
    setEditingId(table.id);
    setForm({
      number: table.number,
      capacity: String(table.capacity),
      location: table.location,
      status: table.status,
    });
    setShowForm(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const number = form.number.trim().toUpperCase();
    const capacity = Number(form.capacity);

    if (!number || !Number.isInteger(capacity) || capacity < 1) {
      window.alert("Enter a valid table number and seating capacity.");
      return;
    }

    const duplicate = tables.some(
      (table) =>
        table.number.toLowerCase() === number.toLowerCase() &&
        table.id !== editingId
    );

    if (duplicate) {
      window.alert("This table number already exists. Please use another number.");
      return;
    }

    const updatedTable = {
      id: editingId ?? Date.now(),
      number,
      capacity,
      location: form.location,
      status: form.status,
    };

    if (editingId !== null) {
      setTables((current) =>
        current.map((table) =>
          table.id === editingId ? updatedTable : table
        )
      );
    } else {
      setTables((current) => [...current, updatedTable]);
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function updateStatus(id, status) {
    setTables((current) =>
      current.map((table) =>
        table.id === id ? { ...table, status } : table
      )
    );
  }

  function deleteTable(table) {
    const confirmed = window.confirm(
      `Are you sure you want to delete table ${table.number}?`
    );

    if (confirmed) {
      setTables((current) =>
        current.filter((item) => item.id !== table.id)
      );
    }
  }

  return (
    <section className="table-management">
      <div className="table-page-heading">
        <div>
          <span className="table-eyebrow">RESTAURANT OPERATIONS</span>
          <h1>Table Management</h1>
          <p>
            Organise restaurant seating, monitor availability, and manage table
            assignments.
          </p>
        </div>

        <button
          type="button"
          className="table-primary-button"
          onClick={openAddForm}
        >
          <span aria-hidden="true">+</span> Add Table
        </button>
      </div>

      <div className="table-summary-grid">
        <article className="table-summary-card">
          <span>Total Tables</span>
          <strong>{tables.length}</strong>
          <small>Registered restaurant tables</small>
        </article>

        <article className="table-summary-card">
          <span>Available</span>
          <strong>{availableCount}</strong>
          <small>Ready for seating</small>
        </article>

        <article className="table-summary-card">
          <span>Occupied</span>
          <strong>{occupiedCount}</strong>
          <small>Currently in use</small>
        </article>

        <article className="table-summary-card">
          <span>Reserved</span>
          <strong>{reservedCount}</strong>
          <small>Allocated for bookings</small>
        </article>
      </div>

      <div className="table-toolbar">
        <div className="table-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by table number..."
            aria-label="Search tables"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter tables by status"
        >
          <option>All Statuses</option>
          {statuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </div>

      <div className="table-list-container">
        <div className="table-list-heading">
          <div>
            <h2>Restaurant Tables</h2>
            <p>{filteredTables.length} tables found</p>
          </div>
        </div>

        <div className="table-list-scroll">
          <table className="restaurant-table">
            <thead>
              <tr>
                <th>Table</th>
                <th>Capacity</th>
                <th>Location</th>
                <th>Status</th>
                <th>Change Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredTables.map((table) => (
                <tr key={table.id}>
                  <td>
                    <span className="restaurant-table-number">
                      {table.number}
                    </span>
                  </td>

                  <td>
                    {table.capacity} {table.capacity === 1 ? "seat" : "seats"}
                  </td>

                  <td>{table.location}</td>

                  <td>
                    <span
                      className={`table-status status-${table.status
                        .toLowerCase()
                        .replace(" ", "-")}`}
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
                      onChange={(event) =>
                        updateStatus(table.id, event.target.value)
                      }
                    >
                      {statuses.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <div className="table-row-actions">
                      <button
                        type="button"
                        className="table-action-button"
                        onClick={() => openEditForm(table)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="table-action-button table-delete-button"
                        onClick={() => deleteTable(table)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredTables.length === 0 && (
                <tr>
                  <td colSpan="6" className="table-empty-state">
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
              setShowForm(false);
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
                  {editingId !== null ? "Edit Table" : "Add Table"}
                </h2>
              </div>

              <button
                type="button"
                className="table-modal-close"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
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
                >
                  {locations.map((location) => (
                    <option key={location}>{location}</option>
                  ))}
                </select>
              </label>

              <label>
                Status
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  {statuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>

              <div className="table-modal-actions">
                <button
                  type="button"
                  className="table-secondary-button"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="table-primary-button">
                  {editingId !== null ? "Save Changes" : "Add Table"}
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