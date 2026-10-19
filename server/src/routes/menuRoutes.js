const express = require("express");
const mongoose = require("mongoose");

const {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require("../controllers/menuController");

const router = express.Router();

const BRANCH_ID = "6ad0e90a53cc462cbaaec9fa";

// Verify that the supplied branch exists and is active.
const verifyBranch = async (req, res, next) => {
  try {
    const branchId = req.params.branchId || req.body.branchId || BRANCH_ID;

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

// GET: Retrieve menu items for a branch.
router.get("/:branchId", verifyBranch, getMenuItems);

// POST: Add a menu item to a branch.
router.post("/", verifyBranch, createMenuItem);

// PUT: Update a menu item belonging to the specified branch.
router.put("/:branchId/:itemId", verifyBranch, updateMenuItem);

// DELETE: Remove a menu item belonging to the specified branch.
router.delete("/:branchId/:itemId", verifyBranch, deleteMenuItem);

module.exports = router;