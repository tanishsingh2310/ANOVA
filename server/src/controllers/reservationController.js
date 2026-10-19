const mongoose = require("mongoose");
const Reservation = require("../models/Reservation");

const VALID_STATUSES = [
  "Pending",
  "Confirmed",
  "Completed",
  "Cancelled",
];

const VALID_OCCASIONS = [
  "Regular Dining",
  "Birthday",
  "Anniversary",
  "Business Meeting",
  "Family Dining",
  "Other",
];

const ALLOWED_FIELDS = [
  "customerName",
  "phone",
  "email",
  "date",
  "time",
  "guests",
  "tableNumber",
  "status",
  "occasion",
];

// Validate YYYY-MM-DD calendar dates.
function isValidCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Validate HH:mm time values.
function isValidTime(value) {
  return (
    typeof value === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  );
}

// Normalize phone numbers for comparison.
function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

// Normalize table numbers.
function normalizeTableNumber(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return normalized || "Unassigned";
}

// Extract permitted fields and normalize text values.
function getReservationData(body, isCreate = false) {
  const data = {};

  for (const field of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      data[field] = body[field];
    }
  }

  if (isCreate) {
    data.customerName =
      typeof data.customerName === "string"
        ? data.customerName.trim()
        : data.customerName;

    data.phone =
      typeof data.phone === "string"
        ? data.phone.trim()
        : data.phone;

    data.email =
      typeof data.email === "string"
        ? data.email.trim()
        : data.email;

    data.tableNumber = normalizeTableNumber(data.tableNumber);
  } else {
    if (typeof data.customerName === "string") {
      data.customerName = data.customerName.trim();
    }

    if (typeof data.phone === "string") {
      data.phone = data.phone.trim();
    }

    if (typeof data.email === "string") {
      data.email = data.email.trim();
    }

    if (Object.prototype.hasOwnProperty.call(data, "tableNumber")) {
      data.tableNumber = normalizeTableNumber(data.tableNumber);
    }
  }

  return data;
}

// Validate reservation dates, times, guest counts, statuses and occasions.
function validateReservationData(data, res) {
  if (
    Object.prototype.hasOwnProperty.call(data, "date") &&
    !isValidCalendarDate(data.date)
  ) {
    res.status(400).json({
      message: "Enter a valid reservation date in YYYY-MM-DD format.",
    });
    return false;
  }

  if (
    Object.prototype.hasOwnProperty.call(data, "time") &&
    !isValidTime(data.time)
  ) {
    res.status(400).json({
      message: "Enter a valid reservation time in HH:mm format.",
    });
    return false;
  }

  if (
    Object.prototype.hasOwnProperty.call(data, "guests") &&
    (!Number.isInteger(data.guests) ||
      data.guests < 1 ||
      data.guests > 50)
  ) {
    res.status(400).json({
      message: "Guest count must be a whole number between 1 and 50.",
    });
    return false;
  }

  if (
    Object.prototype.hasOwnProperty.call(data, "status") &&
    !VALID_STATUSES.includes(data.status)
  ) {
    res.status(400).json({
      message: "Invalid reservation status.",
    });
    return false;
  }

  if (
    Object.prototype.hasOwnProperty.call(data, "occasion") &&
    !VALID_OCCASIONS.includes(data.occasion)
  ) {
    res.status(400).json({
      message: "Invalid reservation occasion.",
    });
    return false;
  }

  return true;
}

// Prevent conflicting active bookings for the same guest or table.
async function validateBookingConflicts({
  branchId,
  data,
  excludeId,
}) {
  const date = data.date;
  const time = data.time;

  if (!date || !time) {
    return null;
  }

  const status = data.status || "Pending";
  const tableNumber = normalizeTableNumber(data.tableNumber);

  const isActive = !["Cancelled", "Completed"].includes(status);

  const baseQuery = {
    branchId,
    date,
    time,
    status: { $nin: ["Cancelled", "Completed"] },
  };

  if (excludeId) {
    baseQuery._id = { $ne: excludeId };
  }

  if (isActive && data.phone) {
    const sameGuest = await Reservation.find(baseQuery);

    const phoneConflict = sameGuest.some(
      (reservation) =>
        normalizePhone(reservation.phone) === normalizePhone(data.phone)
    );

    if (phoneConflict) {
      return {
        status: 409,
        message:
          "This phone number already has a reservation at the selected date and time.",
      };
    }
  }

  if (isActive && tableNumber !== "Unassigned") {
    const tableConflict = await Reservation.findOne({
      ...baseQuery,
      tableNumber,
    });

    if (tableConflict) {
      return {
        status: 409,
        message:
          "That table is already assigned to another reservation at this date and time.",
      };
    }
  }

  return null;
}

// GET: Retrieve reservations belonging to a branch.
const getReservations = async (req, res, next) => {
  try {
    const reservations = await Reservation.find({
      branchId: req.branchId,
    }).sort({ date: 1, time: 1, createdAt: 1 });

    res.json(reservations);
  } catch (error) {
    next(error);
  }
};

// POST: Create a reservation.
const createReservation = async (req, res, next) => {
  try {
    const data = getReservationData(req.body, true);

    if (!data.customerName || !data.phone || !data.date || !data.time) {
      return res.status(400).json({
        message:
          "Guest name, phone number, reservation date and time are required.",
      });
    }

    if (data.date < new Date().toLocaleDateString("en-CA")) {
      return res.status(400).json({
        message: "Reservation date cannot be in the past.",
      });
    }

    if (!validateReservationData(data, res)) {
      return;
    }

    const conflict = await validateBookingConflicts({
      branchId: req.branchId,
      data,
    });

    if (conflict) {
      return res.status(conflict.status).json({
        message: conflict.message,
      });
    }

    const reservation = await Reservation.create({
      ...data,
      branchId: req.branchId,
    });

    res.status(201).json(reservation);
  } catch (error) {
    next(error);
  }
};

// PUT: Update a reservation belonging to a branch.
const updateReservation = async (req, res, next) => {
  try {
    const { reservationId } = req.params;

    if (!mongoose.isValidObjectId(reservationId)) {
      return res.status(400).json({
        message: "Invalid reservation ID.",
      });
    }

    const existingReservation = await Reservation.findOne({
      _id: reservationId,
      branchId: req.branchId,
    });

    if (!existingReservation) {
      return res.status(404).json({
        message: "Reservation not found for this branch.",
      });
    }

    const updates = getReservationData(req.body);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update.",
      });
    }

    const effectiveData = {
      ...existingReservation.toObject(),
      ...updates,
    };

    if (
      !effectiveData.customerName ||
      !effectiveData.phone ||
      !effectiveData.date ||
      !effectiveData.time
    ) {
      return res.status(400).json({
        message:
          "Guest name, phone number, reservation date and time are required.",
      });
    }

    if (!validateReservationData(effectiveData, res)) {
      return;
    }

    if (
      effectiveData.date < new Date().toLocaleDateString("en-CA") &&
      effectiveData.status !== "Completed" &&
      effectiveData.status !== "Cancelled"
    ) {
      return res.status(400).json({
        message: "Active reservations cannot have a date in the past.",
      });
    }

    const conflict = await validateBookingConflicts({
      branchId: req.branchId,
      data: effectiveData,
      excludeId: existingReservation._id,
    });

    if (conflict) {
      return res.status(conflict.status).json({
        message: conflict.message,
      });
    }

    Object.assign(existingReservation, updates);

    const updatedReservation = await existingReservation.save();

    res.json(updatedReservation);
  } catch (error) {
    next(error);
  }
};

// DELETE: Delete a reservation belonging to a branch.
const deleteReservation = async (req, res, next) => {
  try {
    const { reservationId } = req.params;

    if (!mongoose.isValidObjectId(reservationId)) {
      return res.status(400).json({
        message: "Invalid reservation ID.",
      });
    }

    const reservation = await Reservation.findOneAndDelete({
      _id: reservationId,
      branchId: req.branchId,
    });

    if (!reservation) {
      return res.status(404).json({
        message: "Reservation not found for this branch.",
      });
    }

    res.json({
      message: "Reservation deleted successfully.",
      reservation,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReservations,
  createReservation,
  updateReservation,
  deleteReservation,
};