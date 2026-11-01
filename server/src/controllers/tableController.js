const mongoose = require("mongoose");
const RestaurantTable = require("../models/Table");
const Order = require("../models/Order");
const Payment = require("../models/Payment");

const getOrderBranchFilter = (branchId) => ({
  $or: [{ branch: branchId }, { branchId }],
});

// Synchronize table occupancy with active dine-in orders.
// Never automatically release a table if its order is Completed
// until its invoice is fully paid.
const syncTableOccupancy = async (branchId) => {
  const tables = await RestaurantTable.find({ branchId });

  for (const table of tables) {
    const activeOrder = await Order.findOne({
      tableId: table._id,
      ...getOrderBranchFilter(branchId),
      orderType: "Dine-in",
      status: { $nin: ["Completed", "Cancelled"] },
    }).select("_id");

    if (activeOrder) {
      if (table.status !== "Occupied") {
        await RestaurantTable.updateOne(
          {
            _id: table._id,
            branchId,
            status: { $ne: "Reserved" },
          },
          { $set: { status: "Occupied" } }
        );
      }

      continue;
    }

    // A completed dine-in order keeps its table occupied
    // until its invoice is fully paid.
    const completedOrder = await Order.findOne({
      tableId: table._id,
      ...getOrderBranchFilter(branchId),
      orderType: "Dine-in",
      status: "Completed",
    }).select("_id");

    if (completedOrder) {
      const invoice = await Payment.findOne({
        branchId,
        orderId: completedOrder._id,
      }).select("status");

      if (!invoice || invoice.status !== "Paid") {
        if (table.status !== "Occupied" && table.status !== "Reserved") {
          await RestaurantTable.updateOne(
            {
              _id: table._id,
              branchId,
              status: { $ne: "Reserved" },
            },
            { $set: { status: "Occupied" } }
          );
        }

        continue;
      }
    }
  }
};

// GET: Retrieve tables belonging to a branch.
const getTables = async (req, res, next) => {
  try {
    await syncTableOccupancy(req.branchId);

    const tables = await RestaurantTable.find({
      branchId: req.branchId,
    }).sort({ number: 1 });

    res.json(tables);
  } catch (error) {
    next(error);
  }
};

// POST: Add a new restaurant table.
const createTable = async (req, res, next) => {
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
};

// PUT: Update a table belonging to the specified branch.
const updateTable = async (req, res, next) => {
  try {
    const { tableId } = req.params;

    if (!mongoose.isValidObjectId(tableId)) {
      return res.status(400).json({
        message: "Invalid table ID.",
      });
    }

    const allowedFields = ["number", "capacity", "location", "status"];
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
};

// DELETE: Remove a table belonging to the specified branch.
const deleteTable = async (req, res, next) => {
  try {
    const { tableId } = req.params;

    if (!mongoose.isValidObjectId(tableId)) {
      return res.status(400).json({
        message: "Invalid table ID.",
      });
    }

    const table = await RestaurantTable.findOne({
      _id: tableId,
      branchId: req.branchId,
    });

    if (!table) {
      return res.status(404).json({
        message: "Table not found for this branch.",
      });
    }

    const activeOrder = await Order.exists({
      tableId: table._id,
      ...getOrderBranchFilter(req.branchId),
      orderType: "Dine-in",
      status: { $nin: ["Completed", "Cancelled"] },
    });

    if (activeOrder) {
      return res.status(409).json({
        message: "Cannot delete a table with an active dine-in order.",
      });
    }

    await RestaurantTable.deleteOne({ _id: table._id });

    res.json({
      message: "Table deleted successfully.",
      table,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTables,
  createTable,
  updateTable,
  deleteTable,
};