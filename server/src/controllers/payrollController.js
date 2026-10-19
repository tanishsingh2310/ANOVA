
const mongoose = require("mongoose");
const Payroll = require("../models/Payroll");
const User = require("../models/User");
const Branch = require("../models/Branch");

const PAYROLL_ROLES = ["owner", "admin", "hr"];
const REVIEW_ROLES = ["owner", "admin", "hr"];

// Validate MongoDB ObjectIds.
function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id) &&
    String(new mongoose.Types.ObjectId(id)) === String(id);
}

// Owners and admins can access all branches.
// HR users are restricted to their assigned branch.
function getBranchFilter(user) {
  if (["owner", "admin"].includes(user.role)) {
    return {};
  }

  return user.branch ? { branch: user.branch._id || user.branch } : { branch: null };
}

function canAccessBranch(user, branchId) {
  if (["owner", "admin"].includes(user.role)) {
    return true;
  }

  return Boolean(
    user.branch &&
    String(user.branch._id || user.branch) === String(branchId)
  );
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Validate payroll amounts and calculate totals.
function calculatePayrollAmounts(body) {
  const fields = [
    "basicSalary",
    "allowances",
    "overtimePay",
    "deductions",
  ];

  const amounts = {};

  for (const field of fields) {
    const value = body[field] === undefined
      ? 0
      : Number(body[field]);

    if (!Number.isFinite(value) || value < 0) {
      return {
        error: `${field} must be a non-negative number.`,
      };
    }

    amounts[field] = roundMoney(value);
  }

  const grossPay = roundMoney(
    amounts.basicSalary +
    amounts.allowances +
    amounts.overtimePay
  );

  const netPay = roundMoney(grossPay - amounts.deductions);

  if (netPay < 0) {
    return {
      error: "Deductions cannot exceed gross pay.",
    };
  }

  return {
    amounts,
    grossPay,
    netPay,
  };
}

async function validateEmployeeAndBranch(employeeId, branchId) {
  if (!isValidId(employeeId) || !isValidId(branchId)) {
    return {
      error: "A valid employee ID and branch ID are required.",
    };
  }

  const [employee, branch] = await Promise.all([
    User.findById(employeeId),
    Branch.findById(branchId),
  ]);

  if (!employee || !employee.isActive || employee.role === "customer" ||
      employee.role === "owner" || employee.role === "admin") {
    return {
      error: "An active employee with an eligible role is required.",
    };
  }

  if (!branch || !branch.isActive) {
    return {
      error: "An active branch is required.",
    };
  }

  if (String(employee.branch) !== String(branch._id)) {
    return {
      error: "The employee does not belong to the selected branch.",
    };
  }

  return { employee, branch };
}

function populatePayroll(query) {
  return query
    .populate("employee", "name email role")
    .populate("branch", "name code")
    .populate("createdBy", "name email role")
    .populate("updatedBy", "name email role")
    .populate("approvedBy", "name email role");
}

// POST /api/payroll
async function createPayroll(req, res) {
  try {
    const {
      employeeId,
      branchId,
      year,
      month,
      notes,
    } = req.body;

    if (
      !Number.isInteger(Number(year)) ||
      !Number.isInteger(Number(month)) ||
      Number(year) < 2020 ||
      Number(year) > 2100 ||
      Number(month) < 1 ||
      Number(month) > 12
    ) {
      return res.status(400).json({
        message: "A valid payroll year and month are required.",
      });
    }

    if (!canAccessBranch(req.user, branchId)) {
      return res.status(403).json({
        message: "You cannot manage payroll for this branch.",
      });
    }

    const validation = await validateEmployeeAndBranch(
      employeeId,
      branchId
    );

    if (validation.error) {
      return res.status(400).json({
        message: validation.error,
      });
    }

    const calculation = calculatePayrollAmounts(req.body);

    if (calculation.error) {
      return res.status(400).json({
        message: calculation.error,
      });
    }

    const payroll = await Payroll.create({
      employee: validation.employee._id,
      branch: validation.branch._id,
      payPeriod: {
        year: Number(year),
        month: Number(month),
      },
      ...calculation.amounts,
      grossPay: calculation.grossPay,
      netPay: calculation.netPay,
      notes: typeof notes === "string" ? notes.trim() : "",
      createdBy: req.user._id,
    });

    const populated = await populatePayroll(
      Payroll.findById(payroll._id)
    );

    return res.status(201).json({
      message: "Payroll record created successfully.",
      payroll: populated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Payroll already exists for this employee and pay period.",
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error("Create payroll error:", error.message);
    return res.status(500).json({
      message: "Failed to create payroll record.",
    });
  }
}

// GET /api/payroll
async function getPayrollRecords(req, res) {
  try {
    const filter = getBranchFilter(req.user);
    const { employeeId, year, month, status } = req.query;

    if (employeeId) {
      if (!isValidId(employeeId)) {
        return res.status(400).json({
          message: "Invalid employee ID.",
        });
      }

      filter.employee = employeeId;
    }

    if (year !== undefined) {
      if (!/^\d{4}$/.test(year) || Number(year) < 2020 ||
          Number(year) > 2100) {
        return res.status(400).json({
          message: "Invalid payroll year.",
        });
      }

      filter["payPeriod.year"] = Number(year);
    }

    if (month !== undefined) {
      if (!/^\d{1,2}$/.test(month) ||
          Number(month) < 1 || Number(month) > 12) {
        return res.status(400).json({
          message: "Invalid payroll month.",
        });
      }

      filter["payPeriod.month"] = Number(month);
    }

    if (status !== undefined) {
      if (!["draft", "approved", "paid", "cancelled"].includes(status)) {
        return res.status(400).json({
          message: "Invalid payroll status.",
        });
      }

      filter.status = status;
    }

    const payrolls = await populatePayroll(
      Payroll.find(filter)
        .sort({ "payPeriod.year": -1, "payPeriod.month": -1, createdAt: -1 })
        .limit(500)
    );

    return res.status(200).json({
      count: payrolls.length,
      payrolls,
    });
  } catch (error) {
    console.error("Get payroll records error:", error.message);
    return res.status(500).json({
      message: "Failed to retrieve payroll records.",
    });
  }
}

// GET /api/payroll/:id
async function getPayrollById(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid payroll ID.",
      });
    }

    const payroll = await populatePayroll(
      Payroll.findOne({
        _id: req.params.id,
        ...getBranchFilter(req.user),
      })
    );

    if (!payroll) {
      return res.status(404).json({
        message: "Payroll record not found.",
      });
    }

    return res.status(200).json({ payroll });
  } catch (error) {
    console.error("Get payroll by ID error:", error.message);
    return res.status(500).json({
      message: "Failed to retrieve payroll record.",
    });
  }
}

// PATCH /api/payroll/:id
// Only draft records can be edited.
async function updatePayroll(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid payroll ID.",
      });
    }

    const allowedFields = [
      "basicSalary",
      "allowances",
      "overtimePay",
      "deductions",
      "notes",
    ];

    const suppliedFields = Object.keys(req.body);
    const invalidFields = suppliedFields.filter(
      (field) => !allowedFields.includes(field)
    );

    if (invalidFields.length > 0 || suppliedFields.length === 0) {
      return res.status(400).json({
        message: "Only salary components and notes can be updated.",
        invalidFields,
      });
    }

    const payroll = await Payroll.findOne({
      _id: req.params.id,
      ...getBranchFilter(req.user),
    });

    if (!payroll) {
      return res.status(404).json({
        message: "Payroll record not found.",
      });
    }

    if (payroll.status !== "draft") {
      return res.status(409).json({
        message: "Only draft payroll records can be updated.",
      });
    }

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        if (field === "notes") {
          if (typeof req.body.notes !== "string") {
            return res.status(400).json({
              message: "Notes must be a string.",
            });
          }

          payroll.notes = req.body.notes.trim();
        } else {
          const value = Number(req.body[field]);

          if (!Number.isFinite(value) || value < 0) {
            return res.status(400).json({
              message: `${field} must be a non-negative number.`,
            });
          }

          payroll[field] = roundMoney(value);
        }
      }
    }

    payroll.updatedBy = req.user._id;
    await payroll.save();

    const populated = await populatePayroll(
      Payroll.findById(payroll._id)
    );

    return res.status(200).json({
      message: "Payroll updated successfully.",
      payroll: populated,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    console.error("Update payroll error:", error.message);
    return res.status(500).json({
      message: "Failed to update payroll record.",
    });
  }
}

// PATCH /api/payroll/:id/approve
async function approvePayroll(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid payroll ID.",
      });
    }

    const payroll = await Payroll.findOne({
      _id: req.params.id,
      ...getBranchFilter(req.user),
    });

    if (!payroll) {
      return res.status(404).json({
        message: "Payroll record not found.",
      });
    }

    if (payroll.status !== "draft") {
      return res.status(409).json({
        message: "Only draft payroll records can be approved.",
      });
    }

    payroll.status = "approved";
    payroll.approvedBy = req.user._id;
    payroll.approvedAt = new Date();
    payroll.updatedBy = req.user._id;

    await payroll.save();

    const populated = await populatePayroll(
      Payroll.findById(payroll._id)
    );

    return res.status(200).json({
      message: "Payroll approved successfully.",
      payroll: populated,
    });
  } catch (error) {
    console.error("Approve payroll error:", error.message);
    return res.status(500).json({
      message: "Failed to approve payroll.",
    });
  }
}

// PATCH /api/payroll/:id/pay
async function markPayrollPaid(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid payroll ID.",
      });
    }

    const { paymentDate, paymentReference } = req.body;

    const parsedPaymentDate = paymentDate === undefined
      ? new Date()
      : new Date(paymentDate);

    if (Number.isNaN(parsedPaymentDate.getTime())) {
      return res.status(400).json({
        message: "Invalid payment date.",
      });
    }

    if (
      paymentReference !== undefined &&
      (typeof paymentReference !== "string" ||
        paymentReference.length > 100)
    ) {
      return res.status(400).json({
        message: "Payment reference must be a string of at most 100 characters.",
      });
    }

    const payroll = await Payroll.findOne({
      _id: req.params.id,
      ...getBranchFilter(req.user),
    });

    if (!payroll) {
      return res.status(404).json({
        message: "Payroll record not found.",
      });
    }

    if (payroll.status !== "approved") {
      return res.status(409).json({
        message: "Only approved payroll records can be marked as paid.",
      });
    }

    payroll.status = "paid";
    payroll.paymentDate = parsedPaymentDate;
    payroll.paymentReference = paymentReference
      ? paymentReference.trim()
      : "";
    payroll.updatedBy = req.user._id;

    await payroll.save();

    const populated = await populatePayroll(
      Payroll.findById(payroll._id)
    );

    return res.status(200).json({
      message: "Payroll marked as paid successfully.",
      payroll: populated,
    });
  } catch (error) {
    console.error("Mark payroll paid error:", error.message);
    return res.status(500).json({
      message: "Failed to mark payroll as paid.",
    });
  }
}

// PATCH /api/payroll/:id/cancel
async function cancelPayroll(req, res) {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid payroll ID.",
      });
    }

    const payroll = await Payroll.findOne({
      _id: req.params.id,
      ...getBranchFilter(req.user),
    });

    if (!payroll) {
      return res.status(404).json({
        message: "Payroll record not found.",
      });
    }

    if (!["draft", "approved"].includes(payroll.status)) {
      return res.status(409).json({
        message: "Only draft or approved payroll can be cancelled.",
      });
    }

    payroll.status = "cancelled";
    payroll.updatedBy = req.user._id;

    await payroll.save();

    return res.status(200).json({
      message: "Payroll cancelled successfully.",
      payroll,
    });
  } catch (error) {
    console.error("Cancel payroll error:", error.message);
    return res.status(500).json({
      message: "Failed to cancel payroll.",
    });
  }
}

module.exports = {
  createPayroll,
  getPayrollRecords,
  getPayrollById,
  updatePayroll,
  approvePayroll,
  markPayrollPaid,
  cancelPayroll,
};
