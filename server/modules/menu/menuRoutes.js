const express = require("express");
const mongoose = require("mongoose");
const MenuItem = require("./MenuItem");

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
router.get("/:branchId", verifyBranch, async (req, res, next) => {
  try {
    const menuItems = await MenuItem.find({
      branchId: req.branchId,
    }).sort({ createdAt: -1 });

    res.json(menuItems);
  } catch (error) {
    next(error);
  }
});

// POST: Add a menu item to a branch.
router.post("/", verifyBranch, async (req, res, next) => {
  try {
    const { name, category, description, price, available } = req.body;

    const menuItem = await MenuItem.create({
      branchId: req.branchId,
      name,
      category,
      description,
      price,
      available,
    });

    res.status(201).json(menuItem);
  } catch (error) {
    next(error);
  }
});



// PUT: Update a menu item belonging to the specified branch.
router.put("/:branchId/:itemId", verifyBranch, async (req, res, next) => {
  try {
    const { itemId } = req.params;

    if (!mongoose.isValidObjectId(itemId)) {
      return res.status(400).json({
        message: "Invalid menu item ID.",
      });
    }

    const allowedFields = [
      "name",
      "category",
      "description",
      "price",
      "available",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update.",
      });
    }

    const menuItem = await MenuItem.findOneAndUpdate(
      {
        _id: itemId,
        branchId: req.branchId,
      },
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!menuItem) {
      return res.status(404).json({
        message: "Menu item not found for this branch.",
      });
    }

    res.json(menuItem);
  } catch (error) {
    next(error);
  }
});


// DELETE: Remove a menu item belonging to the specified branch.
router.delete("/:branchId/:itemId", verifyBranch, async (req, res, next) => {
  try {
    const { itemId } = req.params;

    if (!mongoose.isValidObjectId(itemId)) {
      return res.status(400).json({
        message: "Invalid menu item ID.",
      });
    }

    const menuItem = await MenuItem.findOneAndDelete({
      _id: itemId,
      branchId: req.branchId,
    });

    if (!menuItem) {
      return res.status(404).json({
        message: "Menu item not found for this branch.",
      });
    }

    res.json({
      message: "Menu item deleted successfully.",
      item: menuItem,
    });
  } catch (error) {
    next(error);
  }
});




module.exports = router;