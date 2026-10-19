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
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      index: true,
    },

    orderNumber: {
      type: String,
      required: true,
      trim: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    customerName: {
      type: String,
      trim: true,
      default: "",
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

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    totalAmount: {
      type: Number,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    couponCode: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      required: true,
      enum: [
        "Pending",
        "Preparing",
        "Ready",
        "Out for Delivery",
        "Delivered",
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

// Synchronize branch <-> branchId and total <-> totalAmount before saving
orderSchema.pre("validate", function () {
  if (!this.branch && this.branchId) {
    this.branch = this.branchId;
  }
  if (!this.branchId && this.branch) {
    this.branchId = this.branch;
  }
  if (this.total === undefined && this.totalAmount !== undefined) {
    this.total = this.totalAmount;
  }
  if (this.totalAmount === undefined && this.total !== undefined) {
    this.totalAmount = this.total;
  }
});

// An order number must be unique within its branch.
orderSchema.index(
  { branch: 1, orderNumber: 1 },
  { unique: true }
);

// Fast retrieval of order history for a customer
orderSchema.index({ customer: 1, createdAt: -1 });

// Fast retrieval of recent orders for a branch.
orderSchema.index({ branch: 1, createdAt: -1 });
orderSchema.index({ branchId: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);