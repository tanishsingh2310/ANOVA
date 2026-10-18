const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    price: {
      type: Number,
      required: true,
      min: 0.01,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 99,
      validate: {
        validator: Number.isInteger,
        message: "Item quantity must be a whole number.",
      },
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },

    orderNumber: {
      type: String,
      required: true,
      trim: true,
    },

    customer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    orderType: {
      type: String,
      required: true,
      enum: ["Dine-in", "Takeaway", "Delivery"],
    },

    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RestaurantTable",
      default: null,
    },

    table: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
      maxlength: 20,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "An order must contain at least one item.",
      },
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    status: {
      type: String,
      required: true,
      enum: [
        "Pending",
        "Preparing",
        "Ready",
        "Completed",
        "Cancelled",
      ],
      default: "Pending",
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  {
    timestamps: true,
    collection: "orders",
  }
);

// An order number must be unique within its branch.
orderSchema.index(
  { branchId: 1, orderNumber: 1 },
  { unique: true }
);

// Make it easier to retrieve recent orders for a branch.
orderSchema.index({ branchId: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);