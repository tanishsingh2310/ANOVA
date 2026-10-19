const express = require("express");
const mongoose = require("mongoose");

const {
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
} = require("../controllers/orderController");

const router = express.Router();

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

// GET: Retrieve orders belonging to a branch.
router.get("/:branchId", verifyBranch, getOrders);

// POST: Create an order.
router.post("/", verifyBranch, createOrder);

// PUT: Update an existing order.
router.put("/:branchId/:orderId", verifyBranch, updateOrder);

// DELETE: Remove an order belonging to a branch.
router.delete("/:branchId/:orderId", verifyBranch, deleteOrder);

module.exports = router;
