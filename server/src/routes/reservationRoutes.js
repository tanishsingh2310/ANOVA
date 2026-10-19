const express = require("express");
const mongoose = require("mongoose");

const {
  getReservations,
  createReservation,
  updateReservation,
  deleteReservation,
} = require("../controllers/reservationController");

const router = express.Router();

// Temporary development branch.
// Authentication and branch authorization will be integrated
// with Member 1's middleware later.
const BRANCH_ID = "6ad0e90a53cc462cbaaec9fa";

// Verify that the requested branch exists and is active.
const verifyBranch = async (req, res, next) => {
  try {
    const branchId =
      req.params.branchId || req.body.branchId || BRANCH_ID;

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

    req.branchId = branch._id;
    next();
  } catch (error) {
    next(error);
  }
};

// GET: Retrieve reservations belonging to a branch.
router.get("/:branchId", verifyBranch, getReservations);

// POST: Create a reservation.
router.post("/", verifyBranch, createReservation);

// PUT: Update a reservation belonging to a branch.
router.put(
  "/:branchId/:reservationId",
  verifyBranch,
  updateReservation
);

// DELETE: Delete a reservation belonging to a branch.
router.delete(
  "/:branchId/:reservationId",
  verifyBranch,
  deleteReservation
);

module.exports = router;
