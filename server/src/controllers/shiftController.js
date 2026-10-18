
const mongoose = require("mongoose");
const Shift = require("../models/Shift");
const User = require("../models/User");
const Branch = require("../models/Branch");

const SHIFT_MANAGERS = ["owner", "admin", "hr", "manager"];

function validId(id) {
  return mongoose.isValidObjectId(id);
}

function canManageAllBranches(user) {
  return ["owner", "admin"].includes(user.role);
}

function canManageShifts(user) {
  return SHIFT_MANAGERS.includes(user.role);
}

function branchFilter(user) {
  if (canManageAllBranches(user)) {
    return {};
  }

  return { branch: user.branch || null };
}

async function validateBranch(branchId, user) {
  if (!branchId || !validId(branchId)) {
    return { error: "A valid branch ID is required." };
  }

  const branch = await Branch.findOne({
    _id: branchId,
    isActive: true,
  }).select("_id");

  if (!branch) {
    return { error: "Active branch not found." };
  }

  if (
    !canManageAllBranches(user) &&
    String(user.branch) !== String(branch._id)
  ) {
    return {
      error: "You cannot manage shifts for another branch.",
    };
  }

  return { branch };
}

async function validateEmployee(employeeId, branchId) {
  if (!employeeId || !validId(employeeId)) {
    return { error: "A valid employee ID is required." };
  }

  const employee = await User.findOne({
    _id: employeeId,
    branch: branchId,
    isActive: true,
    role: {
      $in: [
        "manager",
        "hr",
        "inventory_manager",
        "chef",
        "cashier",
        "employee",
      ],
    },
  }).select("_id name role branch");

  if (!employee) {
    return {
      error: "Active employee not found in the selected branch.",
    };
  }

  return { employee };
}

function parseDate(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function validBreakMinutes(value) {
  return (
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 240
  );
}

async function hasOverlappingShift({
  employeeId,
  startTime,
  endTime,
  excludeShiftId,
}) {
  const filter = {
    employee: employeeId,
    status: "scheduled",
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };

  if (excludeShiftId) {
    filter._id = { $ne: excludeShiftId };
  }

  return Shift.exists(filter);
}

exports.createShift = async (req, res) => {
  try {
    if (!canManageShifts(req.user)) {
      return res.status(403).json({
        message: "You cannot create shifts.",
      });
    }

    const {
      branch,
      employee,
      title,
      startTime,
      endTime,
      breakMinutes = 0,
      notes = "",
    } = req.body;

    if (
      typeof title !== "string" ||
      title.trim().length < 2 ||
      title.trim().length > 80
    ) {
      return res.status(400).json({
        message: "Shift title must be between 2 and 80 characters.",
      });
    }

    if (
      typeof notes !== "string" ||
      notes.length > 500
    ) {
      return res.status(400).json({
        message: "Notes must be 500 characters or fewer.",
      });
    }

    if (!validBreakMinutes(breakMinutes)) {
      return res.status(400).json({
        message: "Break must be a whole number between 0 and 240.",
      });
    }

    const parsedStart = parseDate(startTime);
    const parsedEnd = parseDate(endTime);

    if (!parsedStart || !parsedEnd) {
      return res.status(400).json({
        message: "Valid start and end dates are required.",
      });
    }

    if (parsedEnd <= parsedStart) {
      return res.status(400).json({
        message: "Shift end time must be after start time.",
      });
    }

    const durationMinutes =
      (parsedEnd.getTime() - parsedStart.getTime()) / 60000;

    if (breakMinutes > durationMinutes) {
      return res.status(400).json({
        message: "Break cannot exceed shift duration.",
      });
    }

    const branchResult = await validateBranch(branch, req.user);

    if (branchResult.error) {
      return res.status(400).json({
        message: branchResult.error,
      });
    }

    const employeeResult = await validateEmployee(
      employee,
      branchResult.branch._id
    );

    if (employeeResult.error) {
      return res.status(400).json({
        message: employeeResult.error,
      });
    }

    const overlap = await hasOverlappingShift({
      employeeId: employeeResult.employee._id,
      startTime: parsedStart,
      endTime: parsedEnd,
    });

    if (overlap) {
      return res.status(409).json({
        message: "This employee already has an overlapping scheduled shift.",
      });
    }

    const shift = await Shift.create({
      branch: branchResult.branch._id,
      employee: employeeResult.employee._id,
      title: title.trim(),
      startTime: parsedStart,
      endTime: parsedEnd,
      breakMinutes,
      notes: notes.trim(),
      createdBy: req.user._id,
    });

    const populatedShift = await Shift.findById(shift._id)
      .populate("employee", "name email role")
      .populate("branch", "name code")
      .populate("createdBy", "name email")
      .lean();

    return res.status(201).json({
      message: "Shift created successfully.",
      shift: populatedShift,
    });
  } catch (error) {
    console.error("Create shift failed:", error.message);
    return res.status(500).json({
      message: "Failed to create shift.",
    });
  }
};


exports.getShifts = async (req, res) => {
  try {
    const isEmployee = req.user.role === "employee";

    if (!isEmployee && !canManageShifts(req.user)) {
      return res.status(403).json({
        message: "You cannot view the shift schedule.",
      });
    }

    if (isEmployee) {
      // Employees can query only their own shifts.
      if (!req.user.branch) {
        return res.status(403).json({
          message: "Your account is not assigned to a branch.",
        });
      }
    } else if (
      !canManageAllBranches(req.user) &&
      !req.user.branch
    ) {
      return res.status(403).json({
        message: "Your account is not assigned to a branch.",
      });
    }

    const filter = isEmployee
      ? {
          employee: req.user._id,
          branch: req.user.branch,
        }
      : { ...branchFilter(req.user) };

    if (req.query.branchId) {
      if (!validId(req.query.branchId)) {
        return res.status(400).json({
          message: "Invalid branch ID.",
        });
      }

      if (
        !canManageAllBranches(req.user) &&
        String(req.user.branch) !== String(req.query.branchId)
      ) {
        return res.status(403).json({
          message: "You cannot view another branch's shifts.",
        });
      }

      filter.branch = req.query.branchId;
    }

    // Never allow an employee-supplied employeeId to change their scope.
    if (req.query.employeeId) {
      if (!validId(req.query.employeeId)) {
        return res.status(400).json({
          message: "Invalid employee ID.",
        });
      }

      if (
        isEmployee &&
        String(req.query.employeeId) !== String(req.user._id)
      ) {
        return res.status(403).json({
          message: "You can only view your own shifts.",
        });
      }

      filter.employee = req.query.employeeId;
    }

    if (req.query.status) {
      if (
        !["scheduled", "cancelled", "completed"].includes(
          req.query.status
        )
      ) {
        return res.status(400).json({
          message: "Invalid shift status.",
        });
      }

      filter.status = req.query.status;
    } else {
      filter.status = { $ne: "cancelled" };
    }

    if (req.query.from || req.query.to) {
      const from = req.query.from
        ? parseDate(req.query.from)
        : null;
      const to = req.query.to
        ? parseDate(req.query.to)
        : null;

      if (
        (req.query.from && !from) ||
        (req.query.to && !to) ||
        (from && to && to <= from)
      ) {
        return res.status(400).json({
          message: "Provide a valid date range with 'to' after 'from'.",
        });
      }

      if (from) {
        filter.startTime = { $gte: from };
      }

      if (to) {
        filter.startTime = {
          ...(filter.startTime || {}),
          $lt: to,
        };
      }
    }

    const shifts = await Shift.find(filter)
      .populate("employee", "name email role")
      .populate("branch", "name code")
      .populate("createdBy", "name email")
      .sort({ startTime: 1 })
      .limit(500)
      .lean();

    return res.json({
      count: shifts.length,
      shifts,
    });
  } catch (error) {
    console.error("Get shifts failed:", error.message);
    return res.status(500).json({
      message: "Failed to retrieve shifts.",
    });
  }
};

exports.getShiftById = async (req, res) => {
  try {
    const isEmployee = req.user.role === "employee";

    if (!isEmployee && !canManageShifts(req.user)) {
      return res.status(403).json({
        message: "You cannot view shift details.",
      });
    }

    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid shift ID.",
      });
    }

    const filter = {
      _id: req.params.id,
      ...branchFilter(req.user),
    };

    if (isEmployee) {
      if (!req.user.branch) {
        return res.status(403).json({
          message: "Your account is not assigned to a branch.",
        });
      }

      filter.employee = req.user._id;
      filter.branch = req.user.branch;
      filter.status = { $ne: "cancelled" };
    } else if (
      !canManageAllBranches(req.user) &&
      !req.user.branch
    ) {
      return res.status(403).json({
        message: "Your account is not assigned to a branch.",
      });
    }

    const shift = await Shift.findOne(filter)
      .populate("employee", "name email role")
      .populate("branch", "name code")
      .populate("createdBy", "name email")
      .lean();

    if (!shift) {
      return res.status(404).json({
        message: "Shift not found.",
      });
    }

    return res.json({ shift });
  } catch (error) {
    console.error("Get shift failed:", error.message);
    return res.status(500).json({
      message: "Failed to retrieve shift.",
    });
  }
};

exports.updateShift = async (req, res) => {
  try {
    if (!canManageShifts(req.user)) {
      return res.status(403).json({
        message: "You cannot update shifts.",
      });
    }

    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid shift ID.",
      });
    }

    const shift = await Shift.findOne({
      _id: req.params.id,
      ...branchFilter(req.user),
    });

    if (!shift) {
      return res.status(404).json({
        message: "Shift not found.",
      });
    }

    if (shift.status !== "scheduled") {
      return res.status(400).json({
        message: "Only scheduled shifts can be updated.",
      });
    }

    const {
      branch,
      employee,
      title,
      startTime,
      endTime,
      breakMinutes,
      notes,
    } = req.body;

    const nextBranchId =
      branch !== undefined ? branch : String(shift.branch);
    const branchResult = await validateBranch(
      nextBranchId,
      req.user
    );

    if (branchResult.error) {
      return res.status(400).json({
        message: branchResult.error,
      });
    }

    const nextEmployeeId =
      employee !== undefined
        ? employee
        : String(shift.employee);

    const employeeResult = await validateEmployee(
      nextEmployeeId,
      branchResult.branch._id
    );

    if (employeeResult.error) {
      return res.status(400).json({
        message: employeeResult.error,
      });
    }

    const nextTitle = title !== undefined ? title : shift.title;
    if (
      typeof nextTitle !== "string" ||
      nextTitle.trim().length < 2 ||
      nextTitle.trim().length > 80
    ) {
      return res.status(400).json({
        message: "Shift title must be between 2 and 80 characters.",
      });
    }

    const nextStart =
      startTime !== undefined
        ? parseDate(startTime)
        : shift.startTime;

    const nextEnd =
      endTime !== undefined
        ? parseDate(endTime)
        : shift.endTime;

    if (!nextStart || !nextEnd || nextEnd <= nextStart) {
      return res.status(400).json({
        message: "Valid start and end dates are required.",
      });
    }

    const nextBreak =
      breakMinutes !== undefined
        ? breakMinutes
        : shift.breakMinutes;

    if (
      !validBreakMinutes(nextBreak) ||
      nextBreak > (nextEnd.getTime() - nextStart.getTime()) / 60000
    ) {
      return res.status(400).json({
        message: "Invalid break duration for this shift.",
      });
    }

    const nextNotes = notes !== undefined ? notes : shift.notes;

    if (
      typeof nextNotes !== "string" ||
      nextNotes.length > 500
    ) {
      return res.status(400).json({
        message: "Notes must be 500 characters or fewer.",
      });
    }

    const overlap = await hasOverlappingShift({
      employeeId: employeeResult.employee._id,
      startTime: nextStart,
      endTime: nextEnd,
      excludeShiftId: shift._id,
    });

    if (overlap) {
      return res.status(409).json({
        message: "This employee already has an overlapping scheduled shift.",
      });
    }

    shift.branch = branchResult.branch._id;
    shift.employee = employeeResult.employee._id;
    shift.title = nextTitle.trim();
    shift.startTime = nextStart;
    shift.endTime = nextEnd;
    shift.breakMinutes = nextBreak;
    shift.notes = nextNotes.trim();

    await shift.save();

    const updatedShift = await Shift.findById(shift._id)
      .populate("employee", "name email role")
      .populate("branch", "name code")
      .populate("createdBy", "name email")
      .lean();

    return res.json({
      message: "Shift updated successfully.",
      shift: updatedShift,
    });
  } catch (error) {
    console.error("Update shift failed:", error.message);
    return res.status(500).json({
      message: "Failed to update shift.",
    });
  }
};

exports.cancelShift = async (req, res) => {
  try {
    if (!canManageShifts(req.user)) {
      return res.status(403).json({
        message: "You cannot cancel shifts.",
      });
    }

    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid shift ID.",
      });
    }

    const shift = await Shift.findOne({
      _id: req.params.id,
      ...branchFilter(req.user),
    });

    if (!shift) {
      return res.status(404).json({
        message: "Shift not found.",
      });
    }

    if (shift.status !== "scheduled") {
      return res.status(400).json({
        message: "Only scheduled shifts can be cancelled.",
      });
    }

    shift.status = "cancelled";
    await shift.save();

    return res.json({
      message: "Shift cancelled successfully.",
      shift: {
        id: shift._id,
        status: shift.status,
      },
    });
  } catch (error) {
    console.error("Cancel shift failed:", error.message);
    return res.status(500).json({
      message: "Failed to cancel shift.",
    });
  }
};

exports.completeShift = async (req, res) => {
  try {
    if (!canManageShifts(req.user)) {
      return res.status(403).json({
        message: "You cannot complete shifts.",
      });
    }

    if (!validId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid shift ID.",
      });
    }

    const shift = await Shift.findOne({
      _id: req.params.id,
      ...branchFilter(req.user),
    });

    if (!shift) {
      return res.status(404).json({
        message: "Shift not found.",
      });
    }

    if (shift.status !== "scheduled") {
      return res.status(400).json({
        message: "Only scheduled shifts can be completed.",
      });
    }

    shift.status = "completed";
    await shift.save();

    return res.json({
      message: "Shift marked as completed.",
      shift: {
        id: shift._id,
        status: shift.status,
      },
    });
  } catch (error) {
    console.error("Complete shift failed:", error.message);
    return res.status(500).json({
      message: "Failed to complete shift.",
    });
  }
};
