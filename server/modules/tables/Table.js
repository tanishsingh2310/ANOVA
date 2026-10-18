const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },

    number: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
      validate: {
        validator: Number.isInteger,
        message: "Seating capacity must be a whole number.",
      },
    },

    location: {
      type: String,
      required: true,
      enum: ["Indoor", "Outdoor", "Private Dining"],
      default: "Indoor",
    },

    status: {
      type: String,
      required: true,
      enum: ["Available", "Occupied", "Reserved"],
      default: "Available",
    },
  },
  {
    timestamps: true,
    collection: "restaurant_tables",
  }
);

// Prevent duplicate table numbers within the same branch.
tableSchema.index(
  { branchId: 1, number: 1 },
  { unique: true }
);

module.exports = mongoose.model("RestaurantTable", tableSchema);