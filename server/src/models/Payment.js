const mongoose = require("mongoose");

const paymentTransactionSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    method: {
      type: String,
      required: true,
      enum: ["Cash", "Card", "UPI", "Online"],
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
    reference: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
  },
  { _id: true }
);

const paymentSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    orderNumber: {
      type: String,
      required: true,
      trim: true,
    },

    invoiceNumber: {
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

    items: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
          maxlength: 100,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0.01,
        },
      },
    ],

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxRate: {
      type: Number,
      default: 5,
      min: 0,
      max: 100,
    },

    total: {
      type: Number,
      required: true,
      min: 0.01,
    },

    transactions: {
      type: [paymentTransactionSchema],
      default: [],
    },

    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["Cash", "Card", "UPI", "Online", "Not recorded"],
      default: "Not recorded",
    },

    status: {
      type: String,
      enum: ["Pending", "Partially Paid", "Paid"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
    collection: "payments",
  }
);

paymentSchema.index(
  { branchId: 1, invoiceNumber: 1 },
  { unique: true }
);

paymentSchema.index(
  { branchId: 1, orderId: 1 },
  { unique: true }
);

paymentSchema.index({ branchId: 1, createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);