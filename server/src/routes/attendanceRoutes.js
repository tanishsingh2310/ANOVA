
const express = require("express");

const {
  clockIn,
  clockOut,
  getAttendance,
  getAttendanceById,
  updateAttendance,
} = require("../controllers/attendanceController");

const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// Employees can record their own attendance.
// HR and management can record attendance for employees.
router.post(
  "/clock-in",
  authorize("owner", "admin", "hr", "manager", "employee"),
  clockIn
);

router.patch(
  "/:id/clock-out",
  authorize("owner", "admin", "hr", "manager", "employee"),
  clockOut
);

// Employees can view their own records; authorized managers can view branch records.
router.get(
  "/",
  authorize("owner", "admin", "hr", "manager", "employee"),
  getAttendance
);

router.get(
  "/:id",
  authorize("owner", "admin", "hr", "manager", "employee"),
  getAttendanceById
);

// Historical attendance corrections are management-only.
router.patch(
  "/:id",
  authorize("owner", "admin", "hr", "manager"),
  updateAttendance
);

module.exports = router;
