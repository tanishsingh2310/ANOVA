
const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    payPeriod: {
      year: {
        type: Number,
        required: true,
        min: 2020,
        max: 2100,
      },
      month: {
        type: Number,
        required: true,
        min: 1,
        max: 12,
      },
    },
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    allowances: {
      type: Number,
      default: 0,
      min: 0,
    },
    overtimePay: {
      type: Number,
      default: 0,
      min: 0,
    },
    deductions: {
      type: Number,
      default: 0,
      min: 0,
    },
    grossPay: {
      type: Number,
      required: true,
      min: 0,
    },
    netPay: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
      enum: ["INR"],
    },
    status: {
      type: String,
      enum: ["draft", "approved", "paid", "cancelled"],
      default: "draft",
      index: true,
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    paymentReference: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// One payroll record per employee per calendar month.
payrollSchema.index(
  {
    employee: 1,
    "payPeriod.year": 1,
    "payPeriod.month": 1,
  },
  { unique: true }
);

payrollSchema.index({
  branch: 1,
  "payPeriod.year": 1,
  "payPeriod.month": 1,
  status: 1,
});

// Calculate totals and validate payroll amounts.
payrollSchema.pre("validate", function () {
  const basic = this.basicSalary;
  const allowances = this.allowances;
  const overtime = this.overtimePay;
  const deductions = this.deductions;

  if (
    [basic, allowances, overtime, deductions].every(
      (value) => Number.isFinite(value) && value >= 0
    )
  ) {
    this.grossPay = Math.round((basic + allowances + overtime) * 100) / 100;
    this.netPay = Math.round((this.grossPay - deductions) * 100) / 100;

    if (this.netPay < 0) {
      this.invalidate(
        "deductions",
        "Deductions cannot exceed gross pay."
      );
    }
  }

  if (this.status === "paid" && !this.paymentDate) {
    this.invalidate(
      "paymentDate",
      "Payment date is required for paid payroll."
    );
  }
});

module.exports = mongoose.model("Payroll", payrollSchema);
