
const mongoose = require("mongoose");
const LeaveRequest = require("../models/LeaveRequest");
const User = require("../models/User");
const Branch = require("../models/Branch");

const LEAVE_REVIEWERS = ["owner", "admin", "hr", "manager"];

const EMPLOYEE_ROLES = [
  "manager",
  "hr",
  "inventory_manager",
  "chef",
  "cashier",
  "employee",
];

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function canManageAllBranches(user) {
  return ["owner", "admin"].includes(user.role);
}

function getBranchFilter(user) {
  if (canManageAllBranches(user)) {
    return {};
  }

  return user.branch
    ? { branch: user.branch }
    : { branch: null };
}

function canReviewLeaves(user) {
  return LEAVE_REVIEWERS.includes(user.role);
}

function getDateRange(dateValue, isEnd = false) {
  if (typeof dateValue !== "string") {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const INDIA_OFFSET_MINUTES = 330;

  const localDate = new Date(Date.UTC(year, month - 1, day));

  if (
    localDate.getUTCFullYear() !== year ||
    localDate.getUTCMonth() !== month - 1 ||
    localDate.getUTCDate() !== day
  ) {
    return null;
  }

  const midnight = Date.UTC(year, month - 1, day);
  const start = new Date(
    midnight - INDIA_OFFSET_MINUTES * 60 * 1000
  );

  if (isEnd) {
    return new Date(start.getTime() + 24 * 60 * 60 * 1000);
  }

  return start;
}

async function validateEmployee(employeeId, branchId) {
  if (!isValidId(employeeId) || !isValidId(branchId)) {
    return { error: "A valid employee and branch are required." };
  }

  const [employee, branch] = await Promise.all([
    User.findOne({
      _id: employeeId,
      isActive: true,
      role: { $in: EMPLOYEE_ROLES },
    }).select("_id branch role name email"),
    Branch.findOne({
      _id: branchId,
      isActive: true,
    }).select("_id name"),
  ]);

  if (!employee) {
    return { error: "Active employee not found." };
  }

  if (!branch) {
    return { error: "Active branch not found." };
  }

  if (
    !employee.branch ||
    employee.branch.toString() !== branch._id.toString()
  ) {
    return { error: "Employee does not belong to this branch." };
  }

  return { employee, branch };
}

function populateLeave(query) {
  return query
    .populate("employee", "name email role")
    .populate("branch", "name code")
    .populate("reviewedBy", "name email role")
    .populate("createdBy", "name email role")
    .populate("updatedBy", "name email role");
}

// Submit a leave request.
exports.createLeaveRequest = async (req, res) => {
  try {
    const isEmployee = req.user.role === "employee";
    const employeeId = isEmployee
      ? req.user._id
      : req.body.employeeId;
    const branchId = isEmployee
      ? req.user.branch
      : req.body.branchId;

    if (
      !isEmployee &&
      !LEAVE_REVIEWERS.includes(req.user.role)
    ) {
      return res.status(403).json({
        message: "You are not authorized to submit leave for employees.",
      });
    }

    if (!branchId) {
      return res.status(400).json({
        message: "A branch is required.",
      });
    }

    if (
      !canManageAllBranches(req.user) &&
      (!req.user.branch ||
        req.user.branch.toString() !== branchId.toString())
    ) {
      return res.status(403).json({
        message: "You cannot access this branch.",
      });
    }

    const validation = await validateEmployee(employeeId, branchId);

    if (validation.error) {
      return res.status(400).json({
        message: validation.error,
      });
    }

    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason?.trim()) {
      return res.status(400).json({
        message: "Leave type, dates, and reason are required.",
      });
    }

    const start = getDateRange(startDate);
    const endExclusive = getDateRange(endDate, true);

    if (!start || !endExclusive) {
      return res.status(400).json({
        message: "Dates must be valid YYYY-MM-DD calendar dates.",
      });
    }

    if (endExclusive <= start) {
      return res.status(400).json({
        message: "End date cannot be before the start date.",
      });
    }

    const lastDayStart = new Date(endExclusive.getTime() - 1);

    const overlapping = await LeaveRequest.findOne({
      employee: employeeId,
      status: { $in: ["pending", "approved"] },
      startDate: { $lt: endExclusive },
      endDate: { $gte: start },
    });

    if (overlapping) {
      return res.status(409).json({
        message: "This request overlaps an existing pending or approved leave.",
      });
    }

    const leaveRequest = await LeaveRequest.create({
      employee: employeeId,
      branch: branchId,
      leaveType,
      startDate: start,
      endDate: lastDayStart,
      reason: reason.trim(),
      createdBy: req.user._id,
    });

    const populated = await populateLeave(
      LeaveRequest.findById(leaveRequest._id)
    );

    return res.status(201).json({
      message: "Leave request submitted successfully.",
      leaveRequest: populated,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Create leave request error:", error);
    return res.status(500).json({
      message: "Unable to submit leave request.",
    });
  }
};

// List leave requests visible to the current user.
exports.getLeaveRequests = async (req, res) => {
  try {
    const filter = { ...getBranchFilter(req.user) };

    if (req.user.role === "employee") {
      filter.employee = req.user._id;
    } else if (req.query.employeeId) {
      if (!isValidId(req.query.employeeId)) {
        return res.status(400).json({
          message: "Invalid employee ID.",
        });
      }

      filter.employee = req.query.employeeId;
    }

    if (req.query.status) {
      const allowedStatuses = [
        "pending",
        "approved",
        "rejected",
        "cancelled",
      ];

      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({
          message: "Invalid leave status.",
        });
      }

      filter.status = req.query.status;
    }

    if (req.query.from) {
      const from = getDateRange(req.query.from);

      if (!from) {
        return res.status(400).json({
          message: "Invalid from date. Use YYYY-MM-DD.",
        });
      }

      filter.endDate = { ...(filter.endDate || {}), $gte: from };
    }

    if (req.query.to) {
      const toExclusive = getDateRange(req.query.to, true);

      if (!toExclusive) {
        return res.status(400).json({
          message: "Invalid to date. Use YYYY-MM-DD.",
        });
      }

      filter.startDate = {
        ...(filter.startDate || {}),
        $lt: toExclusive,
      };
    }

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 100, 1),
      500
    );

    const leaveRequests = await populateLeave(
      LeaveRequest.find(filter)
        .sort({ startDate: -1, createdAt: -1 })
        .limit(limit)
    );

    return res.status(200).json({
      count: leaveRequests.length,
      leaveRequests,
    });
  } catch (error) {
    console.error("Get leave requests error:", error);
    return res.status(500).json({
      message: "Unable to retrieve leave requests.",
    });
  }
};

// Get one leave request.
exports.getLeaveRequestById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid leave request ID.",
      });
    }

    const filter = {
      _id: req.params.id,
      ...getBranchFilter(req.user),
    };

    if (req.user.role === "employee") {
      filter.employee = req.user._id;
    }

    const leaveRequest = await populateLeave(
      LeaveRequest.findOne(filter)
    );

    if (!leaveRequest) {
      return res.status(404).json({
        message: "Leave request not found.",
      });
    }

    return res.status(200).json({ leaveRequest });
  } catch (error) {
    console.error("Get leave request error:", error);
    return res.status(500).json({
      message: "Unable to retrieve leave request.",
    });
  }
};

// Approve or reject a pending request.
exports.reviewLeaveRequest = async (req, res) => {
  try {
    if (!canReviewLeaves(req.user)) {
      return res.status(403).json({
        message: "You are not authorized to review leave requests.",
      });
    }

    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid leave request ID.",
      });
    }

    const { status, reviewNote = "" } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be approved or rejected.",
      });
    }

    if (
      typeof reviewNote !== "string" ||
      reviewNote.length > 1000
    ) {
      return res.status(400).json({
        message: "Review note must be a string of at most 1000 characters.",
      });
    }

    const filter = {
      _id: req.params.id,
      status: "pending",
      ...getBranchFilter(req.user),
    };

    const leaveRequest = await LeaveRequest.findOne(filter);

    if (!leaveRequest) {
      return res.status(404).json({
        message: "Pending leave request not found in your branch.",
      });
    }

    leaveRequest.status = status;
    leaveRequest.reviewNote = reviewNote.trim();
    leaveRequest.reviewedBy = req.user._id;
    leaveRequest.reviewedAt = new Date();
    leaveRequest.updatedBy = req.user._id;

    await leaveRequest.save();

    return res.status(200).json({
      message: `Leave request ${status}.`,
      leaveRequest: await populateLeave(
        LeaveRequest.findById(leaveRequest._id)
      ),
    });
  } catch (error) {
    console.error("Review leave request error:", error);
    return res.status(500).json({
      message: "Unable to review leave request.",
    });
  }
};

// Cancel a pending request by its employee or an authorized reviewer.
exports.cancelLeaveRequest = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid leave request ID.",
      });
    }

    const filter = {
      _id: req.params.id,
      status: "pending",
      ...getBranchFilter(req.user),
    };

    if (req.user.role === "employee") {
      filter.employee = req.user._id;
    } else if (!canReviewLeaves(req.user)) {
      return res.status(403).json({
        message: "You are not authorized to cancel leave requests.",
      });
    }

    const leaveRequest = await LeaveRequest.findOne(filter);

    if (!leaveRequest) {
      return res.status(404).json({
        message: "Pending leave request not found.",
      });
    }

    leaveRequest.status = "cancelled";
    leaveRequest.updatedBy = req.user._id;
    await leaveRequest.save();

    return res.status(200).json({
      message: "Leave request cancelled.",
      leaveRequest: await populateLeave(
        LeaveRequest.findById(leaveRequest._id)
      ),
    });
  } catch (error) {
    console.error("Cancel leave request error:", error);
    return res.status(500).json({
      message: "Unable to cancel leave request.",
    });
  }
};
