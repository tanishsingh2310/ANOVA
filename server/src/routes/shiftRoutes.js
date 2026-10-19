
const express = require("express");

const {
  createShift,
  getShifts,
  getShiftById,
  updateShift,
  cancelShift,
  completeShift,
} = require("../controllers/shiftController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

const shiftManagers = ["owner", "admin", "hr", "manager"];

router.get(
  "/",
  authorize(...shiftManagers, "employee"),
  getShifts
);

router.get(
  "/:id",
  authorize(...shiftManagers, "employee"),
  getShiftById
);

router.post("/", authorize(...shiftManagers), createShift);

router.patch("/:id", authorize(...shiftManagers), updateShift);

router.patch(
  "/:id/cancel",
  authorize(...shiftManagers),
  cancelShift
);

router.patch(
  "/:id/complete",
  authorize(...shiftManagers),
  completeShift
);

module.exports = router;
