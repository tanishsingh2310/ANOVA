
const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Branch = require("../models/Branch");
const Shift = require("../models/Shift");

const ATTENDANCE_MANAGERS = ["owner", "admin", "hr", "manager"];

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

  return user.branch ? { branch: user.branch } : { branch: null };
}


function getTodayRange(dateValue) {
  const INDIA_OFFSET_MINUTES = 330;
  let localDate;

  // Treat YYYY-MM-DD query values as India-local calendar dates.
  if (
    typeof dateValue === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
  ) {
    const [year, month, day] = dateValue.split("-").map(Number);
    localDate = new Date(Date.UTC(year, month - 1, day));

    if (
      localDate.getUTCFullYear() !== year ||
      localDate.getUTCMonth() !== month - 1 ||
      localDate.getUTCDate() !== day
    ) {
      return null;
    }
  } else {
    const date = dateValue ? new Date(dateValue) : new Date();

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    // Convert the instant to its India-local calendar date.
    localDate = new Date(
      date.getTime() + INDIA_OFFSET_MINUTES * 60 * 1000
    );
  }

  const localMidnightAsUtc = Date.UTC(
    localDate.getUTCFullYear(),
    localDate.getUTCMonth(),
    localDate.getUTCDate()
  );

  const start = new Date(
    localMidnightAsUtc - INDIA_OFFSET_MINUTES * 60 * 1000
  );

  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { start, end };
}


function getAttendanceStatus(clockIn, expectedStartTime) {
  if (!expectedStartTime) {
    return "present";
  }

  const expected = new Date(expectedStartTime);

  if (Number.isNaN(expected.getTime())) {
    return "present";
  }

  const lateThreshold = expected.getTime() + 5 * 60 * 1000;

  return clockIn.getTime() > lateThreshold ? "late" : "present";
}

async function validateEmployee(employeeId, branchId) {
  if (!isValidId(employeeId) || !isValidId(branchId)) {
    return { error: "A valid employee ID and branch ID are required.", status: 400 };
  }

  const [employee, branch] = await Promise.all([
    User.findById(employeeId).select("name email role branch isActive"),
    Branch.findById(branchId).select("name isActive"),
  ]);

  if (!branch || !branch.isActive) {
    return { error: "Active branch not found.", status: 404 };
  }

  if (!employee || !employee.isActive) {
    return { error: "Active employee not found.", status: 404 };
  }

  if (String(employee.branch) !== String(branch._id)) {
    return {
      error: "Employee does not belong to the selected branch.",
      status: 400,
    };
  }

  if (!["manager", "hr", "inventory_manager", "chef", "cashier", "employee"].includes(employee.role)) {
    return { error: "This user cannot have employee attendance.", status: 400 };
  }

  return { employee, branch };
}

function canAccessEmployee(user, employeeId) {
  if (canManageAllBranches(user)) {
    return true;
  }

  if (user.role === "employee") {
    return String(user._id) === String(employeeId);
  }

  return true;
}

// Employees can clock themselves in.
// HR and managers can record attendance for employees in their branch.

exports.clockIn = async (req, res) => {
  try {
    const allowedRoles = ["owner", "admin", "hr", "manager", "employee"];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You are not authorized to record attendance.",
      });
    }

    // Employees can only clock themselves in.
    const employeeId =
      req.user.role === "employee"
        ? String(req.user._id)
        : req.body.employeeId;

    const branchId =
      req.user.role === "employee"
        ? String(req.user.branch || "")
        : req.body.branchId;

    if (!canAccessEmployee(req.user, employeeId)) {
      return res.status(403).json({
        message: "You cannot record attendance for this employee.",
      });
    }

    const validation = await validateEmployee(employeeId, branchId);

    if (validation.error) {
      return res.status(validation.status).json({
        message: validation.error,
      });
    }

    if (
      !canManageAllBranches(req.user) &&
      String(req.user.branch || "") !== String(validation.branch._id)
    ) {
      return res.status(403).json({
        message: "You cannot record attendance for another branch.",
      });
    }

    const now = new Date();
    const matchingStart = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const matchingEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Find at most two candidates: two are enough to identify ambiguity.
    const candidates = await Shift.find({
      employee: validation.employee._id,
      branch: validation.branch._id,
      status: "scheduled",
      startTime: { $lte: matchingEnd },
      endTime: { $gte: matchingStart },
    })
      .sort({ startTime: 1 })
      .limit(2)
      .select("_id startTime endTime");

    let matchedShift = null;
    let requiresReview = false;
    let reviewReason = null;

    if (candidates.length === 1) {
      matchedShift = candidates[0];

      // A matched shift can still need review if the clock-in is
      // before its start or after its end.
      if (
        now < matchedShift.startTime ||
        now > matchedShift.endTime
      ) {
        requiresReview = true;
        reviewReason = "outside_shift_window";
      }
    } else if (candidates.length === 0) {
      requiresReview = true;
      reviewReason = "no_scheduled_shift";
    } else {
      // Do not choose arbitrarily when multiple shifts are plausible.
      requiresReview = true;
      reviewReason = "ambiguous_shift";
    }

    // Matched overnight shifts belong to the shift's start date.
    // Unmatched/ambiguous clock-ins use the local clock-in date.
    const attendanceDateRange = getTodayRange(
      matchedShift ? matchedShift.startTime : now
    );

    if (!attendanceDateRange) {
      return res.status(400).json({
        message: "Unable to determine the attendance date.",
      });
    }

    const existing = await Attendance.findOne({
      employee: validation.employee._id,
      attendanceDate: attendanceDateRange.start,
    });

    if (existing) {
      return res.status(409).json({
        message:
          "Attendance has already been recorded for this employee for the attendance date.",
      });
    }

    // Never use req.body.expectedStartTime to determine lateness.
    const status = getAttendanceStatus(
      now,
      matchedShift ? matchedShift.startTime : null
    );

    const attendance = await Attendance.create({
      branch: validation.branch._id,
      employee: validation.employee._id,
      shift: matchedShift ? matchedShift._id : null,
      attendanceDate: attendanceDateRange.start,
      clockIn: now,
      status,
      requiresReview,
      reviewReason,
      notes:
        typeof req.body.notes === "string"
          ? req.body.notes.trim()
          : "",
      createdBy: req.user._id,
    });

    const populated = await Attendance.findById(attendance._id)
      .populate("employee", "name email role")
      .populate("branch", "name code")
      .populate("shift", "title startTime endTime status")
      .populate("createdBy", "name email");

    return res.status(201).json({
      message: requiresReview
        ? "Clock-in recorded; attendance requires review."
        : "Clock-in recorded successfully.",
      attendance: populated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "Attendance has already been recorded for this employee for the attendance date.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Clock-in error:", error.message);

    return res.status(500).json({
      message: "Unable to record clock-in.",
    });
  }
};


// Employees can clock themselves out; managers can clock out employees in their branch.
exports.clockOut = async (req, res) => {
  try {
    if (
  ![
    "owner",
    "admin",
    "hr",
    "manager",
    "employee",
  ].includes(req.user.role)
) {
  return res.status(403).json({
    message: "You are not authorized to clock out attendance.",
  });
}
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "A valid attendance ID is required." });
    }

    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found." });
    }

    if (!canAccessEmployee(req.user, attendance.employee)) {
      return res.status(403).json({ message: "You cannot update this attendance record." });
    }

    if (
      !canManageAllBranches(req.user) &&
      String(req.user.branch || "") !== String(attendance.branch)
    ) {
      return res.status(403).json({ message: "You cannot update attendance for another branch." });
    }

    if (attendance.clockOut) {
      return res.status(409).json({ message: "This attendance record is already clocked out." });
    }

    const now = new Date();

    if (now <= attendance.clockIn) {
      return res.status(400).json({ message: "Clock-out must be after clock-in." });
    }

    const breakMinutes = req.body.breakMinutes === undefined
      ? attendance.breakMinutes
      : Number(req.body.breakMinutes);

    if (!Number.isInteger(breakMinutes) || breakMinutes < 0 || breakMinutes > 240) {
      return res.status(400).json({
        message: "Break duration must be a whole number between 0 and 240 minutes.",
      });
    }

    const durationMinutes = (now.getTime() - attendance.clockIn.getTime()) / 60000;

    if (breakMinutes > durationMinutes) {
      return res.status(400).json({
        message: "Break duration cannot exceed the attendance duration.",
      });
    }

    attendance.clockOut = now;
    attendance.breakMinutes = breakMinutes;
    attendance.updatedBy = req.user._id;

    await attendance.save();

    const populated = await Attendance.findById(attendance._id)
      .populate("employee", "name email role")
      .populate("branch", "name code")
      .populate("updatedBy", "name email");

    return res.status(200).json({
      message: "Clock-out recorded successfully.",
      attendance: populated,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Clock-out error:", error.message);
    return res.status(500).json({ message: "Unable to record clock-out." });
  }
};

// HR and managers can view attendance in their permitted branch.
// Employees can view only their own records.
exports.getAttendance = async (req, res) => {
  try {
    const filter = { ...getBranchFilter(req.user) };

    if (req.user.role === "employee") {
      filter.employee = req.user._id;
    } else if (req.query.employeeId) {
      if (!isValidId(req.query.employeeId)) {
        return res.status(400).json({ message: "A valid employee ID is required." });
      }

      filter.employee = req.query.employeeId;
    }

    if (req.query.status) {
      if (!["present", "late", "absent", "half-day"].includes(req.query.status)) {
        return res.status(400).json({ message: "Invalid attendance status." });
      }

      filter.status = req.query.status;
    }

    const from = req.query.from ? getTodayRange(req.query.from) : null;
    const to = req.query.to ? getTodayRange(req.query.to) : null;

    if (req.query.from && !from) {
      return res.status(400).json({ message: "Invalid from date." });
    }

    if (req.query.to && !to) {
      return res.status(400).json({ message: "Invalid to date." });
    }

    if (from || to) {
      filter.attendanceDate = {};

      if (from) filter.attendanceDate.$gte = from.start;
      if (to) filter.attendanceDate.$lt = to.end;
    }

    const limit = req.query.limit === undefined ? 100 : Number(req.query.limit);

    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      return res.status(400).json({ message: "Limit must be between 1 and 500." });
    }

    const records = await Attendance.find(filter)
      .populate("employee", "name email role")
      .populate("branch", "name code")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ attendanceDate: -1, clockIn: -1 })
      .limit(limit);

    return res.status(200).json({
      count: records.length,
      attendance: records,
    });
  } catch (error) {
    console.error("Get attendance error:", error.message);
    return res.status(500).json({ message: "Unable to retrieve attendance records." });
  }
};

exports.getAttendanceById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "A valid attendance ID is required." });
    }

    const filter = {
      _id: req.params.id,
      ...getBranchFilter(req.user),
    };

    if (req.user.role === "employee") {
      filter.employee = req.user._id;
    }

    const attendance = await Attendance.findOne(filter)
      .populate("employee", "name email role")
      .populate("branch", "name code")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found." });
    }

    return res.status(200).json({ attendance });
  } catch (error) {
    console.error("Get attendance detail error:", error.message);
    return res.status(500).json({ message: "Unable to retrieve attendance record." });
  }
};

// HR can correct attendance details; employees cannot alter historical records.
exports.updateAttendance = async (req, res) => {
  try {
    if (!ATTENDANCE_MANAGERS.includes(req.user.role)) {
      return res.status(403).json({
        message: "You are not authorized to correct attendance records.",
      });
    }
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "A valid attendance ID is required." });
    }

    const filter = {
      _id: req.params.id,
      ...getBranchFilter(req.user),
    };

    const attendance = await Attendance.findOne(filter);

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found." });
    }

    const allowedFields = ["status", "notes", "breakMinutes", "clockIn", "clockOut"];
    const submittedFields = Object.keys(req.body);

    if (submittedFields.some((field) => !allowedFields.includes(field))) {
      return res.status(400).json({ message: "One or more fields cannot be updated." });
    }

    if (req.body.status !== undefined) {
      if (!["present", "late", "absent", "half-day"].includes(req.body.status)) {
        return res.status(400).json({ message: "Invalid attendance status." });
      }

      attendance.status = req.body.status;
    }

    if (req.body.notes !== undefined) {
      if (typeof req.body.notes !== "string" || req.body.notes.length > 500) {
        return res.status(400).json({ message: "Notes must be text up to 500 characters." });
      }

      attendance.notes = req.body.notes.trim();
    }

    if (req.body.breakMinutes !== undefined) {
      const breakMinutes = Number(req.body.breakMinutes);

      if (!Number.isInteger(breakMinutes) || breakMinutes < 0 || breakMinutes > 240) {
        return res.status(400).json({ message: "Break duration must be between 0 and 240 minutes." });
      }

      attendance.breakMinutes = breakMinutes;
    }

    for (const field of ["clockIn", "clockOut"]) {
      if (req.body[field] !== undefined) {
        const value = new Date(req.body[field]);

        if (Number.isNaN(value.getTime())) {
          return res.status(400).json({ message: `Invalid ${field} timestamp.` });
        }

        attendance[field] = value;
      }
    }
    
   
    // Recalculate present/late when the clock-in time is corrected.
    // Preserve explicit absent/half-day corrections.
    if (attendance.shift && req.body.clockIn !== undefined) {
      const linkedShift = await Shift.findById(attendance.shift)
        .select("_id startTime endTime");

      if (!linkedShift) {
        return res.status(409).json({
          message:
            "The linked shift could not be found. Attendance was not updated.",
        });
      }

      if (
        attendance.status !== "absent" &&
        attendance.status !== "half-day"
      ) {
        attendance.status = getAttendanceStatus(
          attendance.clockIn,
          linkedShift.startTime
        );
      }

      const outsideShift =
        attendance.clockIn < linkedShift.startTime ||
        attendance.clockIn > linkedShift.endTime;

      if (outsideShift) {
        attendance.requiresReview = true;
        attendance.reviewReason = "outside_shift_window";
      } else if (
        attendance.reviewReason === "outside_shift_window"
      ) {
        // Clear only this specific review reason.
        attendance.requiresReview = false;
        attendance.reviewReason = null;
      }
    }

        if (
      attendance.clockOut &&
      attendance.clockOut <= attendance.clockIn
    ) {
      return res.status(400).json({
        message: "Clock-out must be after clock-in.",
      });
    }

    if (attendance.clockOut) {
      const durationMinutes =
        (attendance.clockOut.getTime() - attendance.clockIn.getTime()) /
        60000;

      if (attendance.breakMinutes > durationMinutes) {
        return res.status(400).json({
          message: "Break duration cannot exceed the attendance duration.",
        });
      }
    }

    attendance.updatedBy = req.user._id;

    await attendance.save();

    const populated = await Attendance.findById(attendance._id)
      .populate("employee", "name email role")
      .populate("branch", "name code")
      .populate("updatedBy", "name email");

    return res.status(200).json({
      message: "Attendance record updated successfully.",
      attendance: populated,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Update attendance error:", error.message);
    return res.status(500).json({ message: "Unable to update attendance record." });
  }
};
