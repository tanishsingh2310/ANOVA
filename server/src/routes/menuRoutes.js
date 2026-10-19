const express = require("express");
const mongoose = require("mongoose");

const {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require("../controllers/menuController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// Verify that the supplied branch exists and is active.
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

// GET: Retrieve menu items for a branch (publicly accessible for customers and staff).
router.get("/:branchId", verifyBranch, getMenuItems);

// POST: Add a menu item to a branch (staff only).
router.post(
  "/",
  protect,
  authorize("owner", "admin", "manager", "chef"),
  verifyBranch,
  createMenuItem
);

// PUT: Update a menu item belonging to the specified branch (staff only).
router.put(
  "/:branchId/:itemId",
  protect,
  authorize("owner", "admin", "manager", "chef"),
  verifyBranch,
  updateMenuItem
);

// DELETE: Remove a menu item belonging to the specified branch (admin/manager/owner).
router.delete(
  "/:branchId/:itemId",
  protect,
  authorize("owner", "admin", "manager"),
  verifyBranch,
  deleteMenuItem
);

module.exports = router;