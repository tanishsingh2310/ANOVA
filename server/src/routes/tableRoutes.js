const express = require("express");
const mongoose = require("mongoose");

const {
  getTables,
  createTable,
  updateTable,
  deleteTable,
} = require("../controllers/tableController");
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

// GET: Retrieve tables belonging to a branch (authenticated users).
router.get("/:branchId", protect, verifyBranch, getTables);

// POST: Add a new restaurant table (manager, admin, owner).
router.post(
  "/",
  protect,
  authorize("owner", "admin", "manager"),
  verifyBranch,
  createTable
);

// PUT: Update a table belonging to the specified branch (manager, admin, owner).
router.put(
  "/:branchId/:tableId",
  protect,
  authorize("owner", "admin", "manager"),
  verifyBranch,
  updateTable
);

// DELETE: Remove a table belonging to the specified branch (manager, admin, owner).
router.delete(
  "/:branchId/:tableId",
  protect,
  authorize("owner", "admin", "manager"),
  verifyBranch,
  deleteTable
);

module.exports = router;