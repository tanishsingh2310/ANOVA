
const express = require("express");

const {
  clockIn,
  clockOut,
  getAttendance,
  getAttendanceById,
  updateAttendance,
} = require("../controllers/attendanceController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

const attendanceRoles = [
  "owner",
  "admin",
  "hr",
  "manager",
  "inventory_manager",
  "chef",
  "cashier",
  "employee",
  "delivery_personnel",
];

const attendanceManagers = ["owner", "admin", "hr", "manager"];

// Clock-in: operational staff can clock in for themselves.
// The controller enforces self-only access for non-managers.
router.post(
  "/clock-in",
  authorize(...attendanceRoles),
  clockIn
);

// Clock-out: the controller enforces self-only access for staff.
router.patch(
  "/:id/clock-out",
  authorize(...attendanceRoles),
  clockOut
);

// View attendance records.
router.get(
  "/",
  authorize(...attendanceRoles),
  getAttendance
);

router.get(
  "/:id",
  authorize(...attendanceRoles),
  getAttendanceById
);

// Correct historical attendance: managers only.
router.patch(
  "/:id",
  authorize(...attendanceManagers),
  updateAttendance
);

module.exports = router;
