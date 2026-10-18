const express = require("express");
const mongoose = require("mongoose");

const Order = require("./Order");
const MenuItem = require("../menu/MenuItem");
const RestaurantTable = require("../tables/Table");

const router = express.Router();

const BRANCH_ID = "6ad0e90a53cc462cbaaec9fa";

const ORDER_TYPES = ["Dine-in", "Takeaway", "Delivery"];

const ORDER_STATUSES = [
  "Pending",
  "Preparing",
  "Ready",
  "Completed",
  "Cancelled",
];

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

// Validate and normalize order items using actual menu data.
const prepareOrderItems = async (items, branchId) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("An order must contain at least one item.");
  }

  const combinedItems = new Map();

  for (const item of items) {
    if (!item || !mongoose.isValidObjectId(item.menuItemId)) {
      throw new Error("An order contains an invalid menu item.");
    }

    const quantity = Number(item.quantity);

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99
    ) {
      throw new Error(
        "Each item quantity must be a whole number between 1 and 99."
      );
    }

    const menuItemId = String(item.menuItemId);
    const existingQuantity = combinedItems.get(menuItemId) || 0;
    const newQuantity = existingQuantity + quantity;

    if (newQuantity > 99) {
      throw new Error(
        "The combined quantity of an item cannot exceed 99."
      );
    }

    combinedItems.set(menuItemId, newQuantity);
  }

  const menuItemIds = [...combinedItems.keys()];

  const menuItems = await MenuItem.find({
    _id: { $in: menuItemIds },
    branchId,
    available: true,
  });

  if (menuItems.length !== menuItemIds.length) {
    throw new Error(
      "One or more menu items are unavailable or do not belong to this branch."
    );
  }

  const menuItemMap = new Map(
    menuItems.map((item) => [String(item._id), item])
  );

  return menuItemIds.map((menuItemId) => {
    const menuItem = menuItemMap.get(menuItemId);

    return {
      menuItemId: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: combinedItems.get(menuItemId),
    };
  });
};

// Calculate totals using server-validated prices.
const calculateTotal = (items) =>
  Number(
    items
      .reduce((total, item) => {
        return total + item.price * item.quantity;
      }, 0)
      .toFixed(2)
  );

// Validate table selection for dine-in orders.
const prepareTable = async (orderType, tableId, branchId) => {
  if (orderType !== "Dine-in") {
    if (tableId) {
      throw new Error(
        "Only dine-in orders can be assigned to a restaurant table."
      );
    }

    return { tableId: null, table: "" };
  }

  if (!tableId || !mongoose.isValidObjectId(tableId)) {
    throw new Error(
      "Select a valid restaurant table for a dine-in order."
    );
  }

  const restaurantTable = await RestaurantTable.findOne({
    _id: tableId,
    branchId,
  });

  if (!restaurantTable) {
    throw new Error(
      "The selected table does not belong to this branch."
    );
  }

  if (restaurantTable.status === "Reserved") {
    throw new Error(
      "This table is reserved and cannot be assigned to a new order."
    );
  }

  return {
    tableId: restaurantTable._id,
    table: restaurantTable.number,
  };
};

// Generate a readable order number within the branch.
const generateOrderNumber = async (branchId) => {
  const latestOrder = await Order.findOne({ branchId })
    .sort({ createdAt: -1, _id: -1 })
    .select("orderNumber");

  const lastNumber = latestOrder?.orderNumber?.match(/^ORD-(\d+)$/);
  const nextNumber = lastNumber ? Number(lastNumber[1]) + 1 : 1001;

  return `ORD-${nextNumber}`;
};

// GET — Retrieve orders belonging to a branch.
router.get("/:branchId", verifyBranch, async (req, res, next) => {
  try {
    const orders = await Order.find({
      branchId: req.branchId,
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// POST — Create an order.
router.post("/", verifyBranch, async (req, res, next) => {
  try {
    const {
      customer,
      orderType,
      tableId,
      items,
      status,
      notes,
    } = req.body;

    if (
      typeof customer !== "string" ||
      !customer.trim() ||
      customer.trim().length > 100
    ) {
      return res.status(400).json({
        message: "Enter a customer name of up to 100 characters.",
      });
    }

    if (!ORDER_TYPES.includes(orderType)) {
      return res.status(400).json({
        message: "Select a valid order type.",
      });
    }

    if (status !== undefined && !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Select a valid order status.",
      });
    }

    if (
      notes !== undefined &&
      (typeof notes !== "string" || notes.length > 500)
    ) {
      return res.status(400).json({
        message: "Order notes must not exceed 500 characters.",
      });
    }

    const preparedItems = await prepareOrderItems(
      items,
      req.branchId
    );

    const preparedTable = await prepareTable(
      orderType,
      tableId,
      req.branchId
    );

    const orderNumber = await generateOrderNumber(req.branchId);

    const order = await Order.create({
      branchId: req.branchId,
      orderNumber,
      customer: customer.trim(),
      orderType,
      ...preparedTable,
      items: preparedItems,
      totalAmount: calculateTotal(preparedItems),
      status: status || "Pending",
      notes: notes?.trim() || "",
    });

    res.status(201).json(order);
  } catch (error) {
    if (
      error.message.startsWith("An order") ||
      error.message.startsWith("Each item") ||
      error.message.startsWith("The combined") ||
      error.message.startsWith("One or more") ||
      error.message.startsWith("Select a valid restaurant table") ||
      error.message.startsWith("The selected table") ||
      error.message.startsWith("This table") ||
      error.message.startsWith("Only dine-in")
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    next(error);
  }
});

// PUT — Update an existing order.
router.put(
  "/:branchId/:orderId",
  verifyBranch,
  async (req, res, next) => {
    try {
      const { orderId } = req.params;

      if (!mongoose.isValidObjectId(orderId)) {
        return res.status(400).json({
          message: "Invalid order ID.",
        });
      }

      const existingOrder = await Order.findOne({
        _id: orderId,
        branchId: req.branchId,
      });

      if (!existingOrder) {
        return res.status(404).json({
          message: "Order not found for this branch.",
        });
      }

      const {
        customer,
        orderType,
        tableId,
        items,
        status,
        notes,
      } = req.body;

      const updates = {};

      if (customer !== undefined) {
        if (
          typeof customer !== "string" ||
          !customer.trim() ||
          customer.trim().length > 100
        ) {
          return res.status(400).json({
            message: "Enter a valid customer name of up to 100 characters.",
          });
        }

        updates.customer = customer.trim();
      }

      if (orderType !== undefined) {
        if (!ORDER_TYPES.includes(orderType)) {
          return res.status(400).json({
            message: "Select a valid order type.",
          });
        }

        updates.orderType = orderType;
      }

      if (status !== undefined) {
        if (!ORDER_STATUSES.includes(status)) {
          return res.status(400).json({
            message: "Select a valid order status.",
          });
        }

        updates.status = status;
      }

      if (notes !== undefined) {
        if (
          typeof notes !== "string" ||
          notes.length > 500
        ) {
          return res.status(400).json({
            message: "Order notes must not exceed 500 characters.",
          });
        }

        updates.notes = notes.trim();
      }

      const finalOrderType =
        updates.orderType || existingOrder.orderType;

      const finalTableId =
        tableId !== undefined
          ? tableId
          : finalOrderType === "Dine-in"
            ? existingOrder.tableId
            : null;

      if (
        finalOrderType !== "Dine-in" &&
        tableId !== undefined &&
        tableId !== null &&
        tableId !== ""
      ) {
        return res.status(400).json({
          message:
            "Only dine-in orders can be assigned to a restaurant table.",
        });
      }

      if (
        finalOrderType === "Dine-in" &&
        (tableId !== undefined ||
          updates.orderType !== undefined)
      ) {
        const preparedTable = await prepareTable(
          finalOrderType,
          finalTableId,
          req.branchId
        );

        updates.tableId = preparedTable.tableId;
        updates.table = preparedTable.table;
      }

      if (items !== undefined) {
        const preparedItems = await prepareOrderItems(
          items,
          req.branchId
        );

        updates.items = preparedItems;
        updates.totalAmount = calculateTotal(preparedItems);
      }

      if (finalOrderType !== "Dine-in") {
        updates.tableId = null;
        updates.table = "";
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          message: "No valid fields provided for update.",
        });
      }

      const updatedOrder = await Order.findOneAndUpdate(
        {
          _id: orderId,
          branchId: req.branchId,
        },
        updates,
        {
          new: true,
          runValidators: true,
        }
      );

      res.json(updatedOrder);
    } catch (error) {
      if (
        error.message.startsWith("An order") ||
        error.message.startsWith("Each item") ||
        error.message.startsWith("The combined") ||
        error.message.startsWith("One or more") ||
        error.message.startsWith("Select a valid restaurant table") ||
        error.message.startsWith("The selected table") ||
        error.message.startsWith("This table") ||
        error.message.startsWith("Only dine-in")
      ) {
        return res.status(400).json({
          message: error.message,
        });
      }

      next(error);
    }
  }
);

// DELETE — Remove an order belonging to a branch.
router.delete(
  "/:branchId/:orderId",
  verifyBranch,
  async (req, res, next) => {
    try {
      const { orderId } = req.params;

      if (!mongoose.isValidObjectId(orderId)) {
        return res.status(400).json({
          message: "Invalid order ID.",
        });
      }

      const order = await Order.findOneAndDelete({
        _id: orderId,
        branchId: req.branchId,
      });

      if (!order) {
        return res.status(404).json({
          message: "Order not found for this branch.",
        });
      }

      res.json({
        message: "Order deleted successfully.",
        order,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;