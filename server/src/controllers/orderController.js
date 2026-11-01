
const mongoose = require("mongoose");
const Order = require("../models/Order");
const MenuItem = require("../models/MenuItem");
const RestaurantTable = require("../models/Table");
const Payment = require("../models/Payment");

const ORDER_TYPES = ["Dine-in", "Takeaway", "Delivery"];

const ORDER_STATUSES = [
  "Pending",
  "Preparing",
  "Ready",
  "Out for Delivery",
  "Delivered",
  "Completed",
  "Cancelled",
];

const getOrderBranchFilter = (branchId) => ({
  $or: [{ branch: branchId }, { branchId }],
});

const getRouteOrderId = (req) =>
  req.params.orderId || req.params.id;

const releaseTableIfEligible = async (order) => {
  if (
    !order ||
    order.orderType !== "Dine-in" ||
    order.status !== "Completed" ||
    !order.tableId
  ) {
    return;
  }

  const invoice = await Payment.findOne({
    branchId: order.branchId,
    orderId: order._id,
  });

  if (!invoice || invoice.status !== "Paid") {
    return;
  }

  const otherActiveOrder = await Order.exists({
    _id: { $ne: order._id },
    tableId: order.tableId,
    ...getOrderBranchFilter(order.branchId),
    status: { $nin: ["Completed", "Cancelled"] },
  });

  if (otherActiveOrder) return;

  await RestaurantTable.updateOne(
    {
      _id: order.tableId,
      branchId: order.branchId,
      status: "Occupied",
    },
    { $set: { status: "Available" } }
  );
};

const prepareTable = async (
  orderType,
  tableId,
  branchId,
  existingOrder = null
) => {
  if (!ORDER_TYPES.includes(orderType)) {
    throw new Error("Invalid order type.");
  }

  if (orderType !== "Dine-in") {
    if (tableId) {
      throw new Error(
        "Tables can only be assigned to dine-in orders."
      );
    }

    return { tableId: null, table: "" };
  }

  if (
    !tableId ||
    !mongoose.Types.ObjectId.isValid(tableId)
  ) {
    throw new Error(
      "A valid table is required for dine-in orders."
    );
  }

  const restaurantTable = await RestaurantTable.findOne({
    _id: tableId,
    branchId,
  });

  if (!restaurantTable) {
    throw new Error("Table not found in this branch.");
  }

  if (restaurantTable.status === "Reserved") {
    throw new Error("This table is reserved.");
  }

  const keepingExistingTable =
    existingOrder &&
    existingOrder.orderType === "Dine-in" &&
    String(existingOrder.tableId) === String(tableId);

  if (
    restaurantTable.status === "Occupied" &&
    !keepingExistingTable
  ) {
    throw new Error(
      "This table is already occupied by another order."
    );
  }

  return {
    tableId: restaurantTable._id,
    table: restaurantTable.number,
  };
};

const claimTable = async (tableId, branchId) => {
  const table = await RestaurantTable.findOneAndUpdate(
    {
      _id: tableId,
      branchId,
      status: "Available",
    },
    { $set: { status: "Occupied" } },
    { new: true }
  );

  if (!table) {
    throw new Error(
      "This table is no longer available. Refresh and try again."
    );
  }

  return table;
};

const prepareItems = async (items, branchId) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one order item is required.");
  }

  const preparedItems = [];
  let total = 0;

  for (const item of items) {
    if (
      !item.menuItemId ||
      !mongoose.Types.ObjectId.isValid(item.menuItemId)
    ) {
      throw new Error("Invalid menu item ID.");
    }

    const menuItem = await MenuItem.findOne({
      _id: item.menuItemId,
      branchId,
    });

    if (!menuItem) {
      throw new Error(
        `Menu item not found: ${item.menuItemId}`
      );
    }

    const quantity = Number(item.quantity);

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99
    ) {
      throw new Error(
        "Item quantity must be a whole number between 1 and 99."
      );
    }

    const price = Number(menuItem.price);

    if (!Number.isFinite(price) || price < 0.01) {
      throw new Error(
        `Invalid price for menu item: ${menuItem.name}`
      );
    }

    total += price * quantity;

    preparedItems.push({
      menuItemId: menuItem._id,
      name: menuItem.name,
      quantity,
      price,
    });
  }

  return { items: preparedItems, total };
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      ...getOrderBranchFilter(req.branchId),
      customer: req.user?._id,
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch orders.",
    });
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await Order.find(
      getOrderBranchFilter(req.branchId)
    ).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch orders.",
    });
  }
};

const createOrder = async (req, res) => {
  let claimedTableId = null;
  let orderCreated = false;

  try {
    const {
      orderType,
      tableId,
      items,
      status,
      notes,
      customerName,
    } = req.body;

    const customerId = req.user?._id;

    if (
      !customerId ||
      !mongoose.Types.ObjectId.isValid(customerId)
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated customer is required to create an order.",
      });
    }

    if (!ORDER_TYPES.includes(orderType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order type.",
      });
    }

    if (status && !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status.",
      });
    }

    if (status === "Completed") {
      return res.status(400).json({
        success: false,
        message:
          "An order cannot be created as already Completed.",
      });
    }

    const preparedTable = await prepareTable(
      orderType,
      tableId,
      req.branchId
    );

    const prepared = await prepareItems(
      items,
      req.branchId
    );

    const orderNumber =
      `ORD-${Date.now()}-${new mongoose.Types.ObjectId()
        .toString()
        .slice(-6)
        .toUpperCase()}`;

    if (orderType === "Dine-in") {
      await claimTable(preparedTable.tableId, req.branchId);
      claimedTableId = preparedTable.tableId;
    }

    const order = await Order.create({
      branch: req.branchId,
      branchId: req.branchId,
      customer: customerId,
      orderNumber,
      orderType,
      ...preparedTable,
      items: prepared.items,
      total: prepared.total,
      totalAmount: prepared.total,
      status: status || "Pending",
      outForDeliveryAt:
        status === "Out for Delivery" ? new Date() : null,
      notes: notes || "",
      customerName: customerName || "",
    });

    orderCreated = true;

    return res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    if (claimedTableId && !orderCreated) {
      await RestaurantTable.updateOne(
        {
          _id: claimedTableId,
          branchId: req.branchId,
          status: "Occupied",
        },
        { $set: { status: "Available" } }
      ).catch(() => {});
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create order.",
    });
  }
};

const updateOrder = async (req, res) => {
  let newlyClaimedTableId = null;
  let updateSucceeded = false;

  try {
    // FIX: Route parameter is :orderId, not :id.
    const orderId = getRouteOrderId(req);

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    const existingOrder = await Order.findOne({
      _id: orderId,
      ...getOrderBranchFilter(req.branchId),
    });

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const {
      orderType,
      tableId,
      items,
      status,
      notes,
      customerName,
    } = req.body;

    const nextOrderType =
      orderType ?? existingOrder.orderType;

    const nextStatus = status ?? existingOrder.status;

    if (!ORDER_TYPES.includes(nextOrderType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order type.",
      });
    }

    if (!ORDER_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status.",
      });
    }

    if (
      existingOrder.status === "Completed" &&
      nextStatus !== "Completed"
    ) {
      return res.status(400).json({
        success: false,
        message: "A completed order cannot be reopened.",
      });
    }

    if (existingOrder.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "A cancelled order cannot be updated.",
      });
    }

    const requestedTableId =
      tableId !== undefined
        ? tableId
        : existingOrder.tableId;

    const changingTableOrType =
      nextOrderType !== existingOrder.orderType ||
      (nextOrderType === "Dine-in" &&
        String(requestedTableId || "") !==
          String(existingOrder.tableId || ""));

    if (
      existingOrder.orderType === "Dine-in" &&
      existingOrder.tableId &&
      changingTableOrType
    ) {
      const invoice = await Payment.findOne({
        branchId: req.branchId,
        orderId: existingOrder._id,
      });

      if (
        existingOrder.status !== "Completed" ||
        !invoice ||
        invoice.status !== "Paid"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Complete the order and fully pay its invoice before changing its table or order type.",
        });
      }
    }

    let preparedTable = {
      tableId: existingOrder.tableId,
      table: existingOrder.table,
    };

    if (nextOrderType !== "Dine-in") {
      preparedTable = { tableId: null, table: "" };
    } else if (changingTableOrType) {
      preparedTable = await prepareTable(
        nextOrderType,
        requestedTableId,
        req.branchId,
        existingOrder
      );

      const sameTable =
        String(preparedTable.tableId) ===
        String(existingOrder.tableId);

      if (!sameTable) {
        await claimTable(
          preparedTable.tableId,
          req.branchId
        );

        newlyClaimedTableId = preparedTable.tableId;
      }
    }

    const updates = {
      orderType: nextOrderType,
      status: nextStatus,
      ...preparedTable,
    };

    // Start the 15-minute timer only when entering this status.
    if (
      nextStatus === "Out for Delivery" &&
      existingOrder.status !== "Out for Delivery"
    ) {
      updates.outForDeliveryAt = new Date();
    }

    // Clear the timer if the order leaves this status.
    if (
      nextStatus !== "Out for Delivery" &&
      existingOrder.status === "Out for Delivery"
    ) {
      updates.outForDeliveryAt = null;
    }

    if (notes !== undefined) updates.notes = notes;

    if (customerName !== undefined) {
      updates.customerName = customerName;
    }

    if (items !== undefined) {
      const existingInvoice = await Payment.findOne({
        branchId: req.branchId,
        orderId: existingOrder._id,
      });

      if (existingInvoice) {
        return res.status(400).json({
          success: false,
          message:
            "Items cannot be changed after an invoice has been created.",
        });
      }

      const prepared = await prepareItems(
        items,
        req.branchId
      );

      updates.items = prepared.items;
      updates.total = prepared.total;
      updates.totalAmount = prepared.total;
    }

    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        ...getOrderBranchFilter(req.branchId),
      },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedOrder) {
      throw new Error("Order could not be updated.");
    }

    updateSucceeded = true;

    if (
      existingOrder.tableId &&
      String(existingOrder.tableId) !==
        String(updatedOrder.tableId)
    ) {
      await releaseTableIfEligible(existingOrder);
    }

    await releaseTableIfEligible(updatedOrder);

    return res.json({
      success: true,
      data: updatedOrder,
    });
  } catch (error) {
    if (newlyClaimedTableId && !updateSucceeded) {
      await RestaurantTable.updateOne(
        {
          _id: newlyClaimedTableId,
          branchId: req.branchId,
          status: "Occupied",
        },
        { $set: { status: "Available" } }
      ).catch(() => {});
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update order.",
    });
  }
};

const deleteOrder = async (req, res) => {
  try {
    // FIX: Route parameter is :orderId, not :id.
    const orderId = getRouteOrderId(req);

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      ...getOrderBranchFilter(req.branchId),
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const invoice = await Payment.findOne({
      branchId: req.branchId,
      orderId: order._id,
    });

    if (
      invoice &&
      (
        Number(invoice.amountPaid || 0) > 0 ||
        (invoice.transactions?.length || 0) > 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Orders with payment history cannot be deleted.",
      });
    }

    if (
      order.orderType === "Dine-in" &&
      order.tableId &&
      order.status !== "Completed"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "An active dine-in order cannot be deleted. Cancel it through the order workflow instead.",
      });
    }

    await Order.deleteOne({ _id: order._id });

    return res.json({
      success: true,
      message: "Order deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete order.",
    });
  }
};

const syncTableOccupancy = async (branchId) => {
  const tables = await RestaurantTable.find({ branchId });

  for (const table of tables) {
    const activeOrder = await Order.exists({
      tableId: table._id,
      ...getOrderBranchFilter(branchId),
      orderType: "Dine-in",
      status: {
        $nin: ["Completed", "Cancelled"],
      },
    });

    if (activeOrder && table.status === "Available") {
      await RestaurantTable.updateOne(
        {
          _id: table._id,
          branchId,
          status: "Available",
        },
        { $set: { status: "Occupied" } }
      );
    }
  }
};

module.exports = {
  getMyOrders,
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
};
