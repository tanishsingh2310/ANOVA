
const express = require("express");
const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const {
  createLeaveRequest,
  getLeaveRequests,
  getLeaveRequestById,
  reviewLeaveRequest,
  cancelLeaveRequest,
} = require("../controllers/leaveController");

const router = express.Router();

const LEAVE_USERS = [
  "owner",
  "admin",
  "manager",
  "hr",
  "inventory_manager",
  "chef",
  "cashier",
  "employee",
];

router.use(protect);
router.use(authorize(...LEAVE_USERS));

// Submit a leave request.
router.post("/", createLeaveRequest);

// List leave requests.
router.get("/", getLeaveRequests);

// View a single request.
router.get("/:id", getLeaveRequestById);

// Approve or reject a pending request.
router.patch("/:id/review", reviewLeaveRequest);

// Cancel a pending request.
router.patch("/:id/cancel", cancelLeaveRequest);

module.exports = router;
