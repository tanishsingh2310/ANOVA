const express = require("express");
const mongoose = require("mongoose");

const {
  getReservations,
  createReservation,
  updateReservation,
  deleteReservation,
} = require("../controllers/reservationController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Verify that the requested branch exists and is active.
const verifyBranch = async (req, res, next) => {
  try {
    const branchId =
      req.params.branchId ||
      req.body.branchId ||
      req.body.branch ||
      req.query.branchId ||
      req.query.branch ||
      (req.user && req.user.branch);

    if (!branchId) {
      return res.status(400).json({
        message: "Branch ID is required.",
      });
    }

    if (!mongoose.isValidObjectId(branchId)) {
      return res.status(400).json({
        message: "Invalid branch ID.",
      });
    }

    const branch = await mongoose.connection
      .collection("branches")
      .findOne({
        _id: new mongoose.Types.ObjectId(branchId),
        isActive: true,
      });

    if (!branch) {
      return res.status(404).json({
        message: "Active branch not found.",
      });
    }

    req.branch = branch;
    req.branchId = branch._id;
    next();
  } catch (error) {
    next(error);
  }
};

// GET: Retrieve reservations belonging to a branch (staff only).
router.get(
  "/:branchId",
  protect,
  authorize("owner", "admin", "manager", "cashier", "employee"),
  verifyBranch,
  getReservations
);

// POST: Create a reservation (authenticated customers and staff).
router.post("/", protect, verifyBranch, createReservation);

// PUT: Update a reservation belonging to a branch (staff only).
router.put(
  "/:branchId/:reservationId",
  protect,
  authorize("owner", "admin", "manager", "cashier"),
  verifyBranch,
  updateReservation
);

// DELETE: Delete a reservation belonging to a branch (manager/admin/owner).
router.delete(
  "/:branchId/:reservationId",
  protect,
  authorize("owner", "admin", "manager"),
  verifyBranch,
  deleteReservation
);

module.exports = router;
