const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 18,
      validate: {
        validator: (value) => /^\+?[0-9\s()-]{7,18}$/.test(value),
        message: "Please enter a valid phone number.",
      },
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 120,
      default: "",
      validate: {
        validator: (value) =>
          !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: "Please enter a valid email address.",
      },
    },

    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD date format."],
    },

    time: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Use the HH:mm time format."],
    },

    guests: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
      validate: {
        validator: Number.isInteger,
        message: "Guest count must be a whole number.",
      },
    },

    tableNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "Unassigned",
      maxlength: 20,
    },

    status: {
      type: String,
      required: true,
      enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
      default: "Pending",
    },

    occasion: {
      type: String,
      enum: [
        "Regular Dining",
        "Birthday",
        "Anniversary",
        "Business Meeting",
        "Family Dining",
        "Other",
      ],
      default: "Regular Dining",
    },
  },
  {
    timestamps: true,
    collection: "reservations",
  }
);

// Support efficient reservation queries by branch and booking time.
reservationSchema.index({
  branchId: 1,
  date: 1,
  time: 1,
});

module.exports = mongoose.model("Reservation", reservationSchema);
