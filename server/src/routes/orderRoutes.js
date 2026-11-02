
const express = require("express");
const mongoose = require("mongoose");

const {
  getMyOrders,
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
} = require("../controllers/orderController");

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
      req.user?.branchId ||
      req.user?.branch;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: "Branch ID is required.",
      });
    }

    if (!mongoose.isValidObjectId(branchId)) {
      return res.status(400).json({
        success: false,
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
        success: false,
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

// GET: Retrieve authenticated customer's own orders.
router.get("/my", protect, getMyOrders);

// GET: Retrieve orders belonging to a branch.
router.get(
  "/:branchId",
  protect,
  authorize(
    "owner",
    "admin",
    "manager",
    "cashier",
    "chef",
    "delivery_personnel",
    "employee"
  ),
  verifyBranch,
  getOrders
);

// POST: Create an order.
router.post("/", protect, verifyBranch, createOrder);

// PUT: Update an existing order.
// The controller must read req.params.orderId.
router.put(
  "/:branchId/:orderId",
  protect,
  authorize(
    "owner",
    "admin",
    "manager",
    "cashier",
    "chef",
    "delivery_personnel"
  ),
  verifyBranch,
  updateOrder
);

// DELETE: Delete an order.
router.delete(
  "/:branchId/:orderId",
  protect,
  authorize("owner", "admin", "manager"),
  verifyBranch,
  deleteOrder
);

module.exports = router;
