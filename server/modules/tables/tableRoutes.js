const express = require("express");
const mongoose = require("mongoose");
const RestaurantTable = require("./Table");

const router = express.Router();

// Temporary development branch.
// Authentication and branch authorization will be integrated
// with Member 1's middleware later.
const BRANCH_ID = "6ad0e90a53cc462cbaaec9fa";

// Verify that the requested branch exists and is active.
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

    req.branchId = branch._id;
    next();
  } catch (error) {
    next(error);
  }
};

// GET — Retrieve tables belonging to a branch.
router.get("/:branchId", verifyBranch, async (req, res, next) => {
  try {
    const tables = await RestaurantTable.find({
      branchId: req.branchId,
    }).sort({ number: 1 });

    res.json(tables);
  } catch (error) {
    next(error);
  }
});

// POST — Add a new restaurant table.
router.post("/", verifyBranch, async (req, res, next) => {
  try {
    const { number, capacity, location, status } = req.body;

    const table = await RestaurantTable.create({
      branchId: req.branchId,
      number,
      capacity,
      location,
      status,
    });

    res.status(201).json(table);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This table number already exists in this branch.",
      });
    }

    next(error);
  }
});

// PUT — Update a table belonging to the specified branch.
router.put("/:branchId/:tableId", verifyBranch, async (req, res, next) => {
  try {
    const { tableId } = req.params;

    if (!mongoose.isValidObjectId(tableId)) {
      return res.status(400).json({
        message: "Invalid table ID.",
      });
    }

    const allowedFields = [
      "number",
      "capacity",
      "location",
      "status",
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

    const table = await RestaurantTable.findOneAndUpdate(
      {
        _id: tableId,
        branchId: req.branchId,
      },
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!table) {
      return res.status(404).json({
        message: "Table not found for this branch.",
      });
    }

    res.json(table);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This table number already exists in this branch.",
      });
    }

    next(error);
  }
});

// DELETE — Remove a table belonging to the specified branch.
router.delete("/:branchId/:tableId", verifyBranch, async (req, res, next) => {
  try {
    const { tableId } = req.params;

    if (!mongoose.isValidObjectId(tableId)) {
      return res.status(400).json({
        message: "Invalid table ID.",
      });
    }

    const table = await RestaurantTable.findOneAndDelete({
      _id: tableId,
      branchId: req.branchId,
    });

    if (!table) {
      return res.status(404).json({
        message: "Table not found for this branch.",
      });
    }

    res.json({
      message: "Table deleted successfully.",
      table,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;