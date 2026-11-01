
const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const Order = require("../models/Order");
const RestaurantTable = require("../models/Table");

const PAYMENT_METHODS = ["Cash", "Card", "UPI", "Online"];

const calculateStatus = (amountPaid, total) => {
  if (amountPaid >= total) return "Paid";
  if (amountPaid > 0) return "Partially Paid";
  return "Pending";
};

/**
 * Resolve the branch supplied by the route or existing middleware.
 * For invoice creation, the frontend can supply branchId in the body.
 *
 * IMPORTANT: This resolves an ID; it does not establish authorization.
 * Branch-access authorization must be enforced by your existing
 * branch middleware or user-to-branch permission checks.
 */
const getRequestBranchId = (req) =>
  req.branchId ||
  req.params?.branchId ||
  req.body?.branchId ||
  req.user?.branchId;

const isValidObjectId = (id) =>
  Boolean(id) && mongoose.Types.ObjectId.isValid(id);

const getOrderBranchFilter = (branchId) => ({
  $or: [{ branch: branchId }, { branchId }],
});

const getErrorMessage = (error, fallback) =>
  error?.message || fallback;

/**
 * Release a dine-in table only when:
 * - The order is Completed.
 * - The invoice is fully Paid.
 * - No other active order uses the table.
 */
const releaseTableIfEligible = async (order) => {
  if (
    !order ||
    order.orderType !== "Dine-in" ||
    order.status !== "Completed" ||
    !order.tableId ||
    !order.branchId
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
    {
      $set: { status: "Available" },
    }
  );
};

const getInvoices = async (req, res) => {
  try {
    const branchId = getRequestBranchId(req);

    if (!isValidObjectId(branchId)) {
      return res.status(400).json({
        success: false,
        message: "Valid branch ID is required.",
      });
    }

    const invoices = await Payment.find({ branchId })
      .populate("orderId")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    console.error("Get invoices error:", error);

    return res.status(500).json({
      success: false,
      message: getErrorMessage(error, "Failed to fetch invoices."),
    });
  }
};


const createInvoice = async (req, res) => {
  try {
    const branchId = getRequestBranchId(req);
    const { orderId, discount, taxRate } = req.body;

    if (!branchId || !mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({
        success: false,
        message: "Valid branch ID is required.",
      });
    }

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Valid order ID is required.",
      });
    }

    // Find the order within the selected branch.
    const order = await Order.findOne({
      _id: orderId,
      ...getOrderBranchFilter(branchId),
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found in this branch.",
      });
    }

    // Only completed or out-for-delivery orders can be invoiced.
    const allowedInvoiceStatuses = [
      "Completed",
      "Out for Delivery",
    ];

    if (!allowedInvoiceStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message:
          "An invoice can only be created when the order is Completed or Out for Delivery.",
      });
    }

    // Prevent duplicate invoices for the same order.
    const existingInvoice = await Payment.findOne({
      branchId,
      orderId: order._id,
    });

    if (existingInvoice) {
      return res.status(409).json({
        success: false,
        message: "An invoice already exists for this order.",
        data: existingInvoice,
      });
    }

    if (!Array.isArray(order.items) || order.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot create an invoice for an order without items.",
      });
    }

    const subtotal = order.items.reduce((sum, item) => {
      const price = Number(item.price);
      const quantity = Number(item.quantity);

      if (
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        throw new Error("INVALID_ORDER_ITEM");
      }

      return sum + price * quantity;
    }, 0);

    const invoiceDiscount =
      discount === undefined
        ? Number(order.discount || 0)
        : Number(discount);

    const invoiceTaxRate =
      taxRate === undefined ? 5 : Number(taxRate);

    if (
      !Number.isFinite(invoiceDiscount) ||
      invoiceDiscount < 0 ||
      invoiceDiscount > subtotal
    ) {
      return res.status(400).json({
        success: false,
        message: "Discount must be between zero and the subtotal.",
      });
    }

    if (
      !Number.isFinite(invoiceTaxRate) ||
      invoiceTaxRate < 0 ||
      invoiceTaxRate > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Tax rate must be between 0 and 100.",
      });
    }

    const invoiceTotal = Number(
      (
        (subtotal - invoiceDiscount) *
        (1 + invoiceTaxRate / 100)
      ).toFixed(2)
    );

    if (!Number.isFinite(invoiceTotal) || invoiceTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invoice total must be greater than zero.",
      });
    }

    const invoiceNumber =
      `INV-${Date.now()}-${new mongoose.Types.ObjectId()
        .toString()
        .slice(-6)
        .toUpperCase()}`;

    const invoice = await Payment.create({
      branchId,
      orderId: order._id,
      orderNumber: order.orderNumber || String(order._id),
      invoiceNumber,
      customer: String(
        order.customerName || order.customer || "Walk-in Customer"
      ),
      items: order.items.map((item) => ({
        name: item.name || "Item",
        quantity: Number(item.quantity),
        price: Number(item.price),
      })),
      subtotal: Number(subtotal.toFixed(2)),
      discount: invoiceDiscount,
      taxRate: invoiceTaxRate,
      total: invoiceTotal,
      amountPaid: 0,
      paymentMethod: "Not recorded",
      status: "Pending",
    });

    return res.status(201).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An invoice already exists for this order.",
      });
    }

    if (error.message === "INVALID_ORDER_ITEM") {
      return res.status(400).json({
        success: false,
        message: "The order contains an invalid item price or quantity.",
      });
    }

    console.error("Create invoice error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create invoice.",
    });
  }
};


const recordPayment = async (req, res) => {
  try {
    const branchId = getRequestBranchId(req);
    const { invoiceId } = req.params;
    const { amount, method, reference } = req.body;

    if (!isValidObjectId(branchId)) {
      return res.status(400).json({
        success: false,
        message: "Valid branch ID is required.",
      });
    }

    if (!isValidObjectId(invoiceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID.",
      });
    }

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero.",
      });
    }

    if (!PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });
    }

    const invoice = await Payment.findOne({
      _id: invoiceId,
      branchId,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found.",
      });
    }

    const total = Number(invoice.total);
    const amountPaid = Number(invoice.amountPaid || 0);
    const balance = Math.max(0, total - amountPaid);

    if (balance <= 0 || invoice.status === "Paid") {
      return res.status(400).json({
        success: false,
        message: "This invoice is already fully paid.",
      });
    }

    if (paymentAmount > balance + 0.001) {
      return res.status(400).json({
        success: false,
        message:
          `Payment exceeds the remaining balance of ${balance.toFixed(2)}.`,
      });
    }

    const appliedAmount = Math.min(paymentAmount, balance);

    invoice.transactions.push({
      amount: appliedAmount,
      method,
      reference: reference || "",
      transactionDate: new Date(),
    });

    invoice.amountPaid = Math.min(total, amountPaid + appliedAmount);
    invoice.paymentMethod = method;
    invoice.status = calculateStatus(invoice.amountPaid, total);

    await invoice.save();

    if (invoice.status === "Paid") {
      const order = await Order.findOne({
        _id: invoice.orderId,
        ...getOrderBranchFilter(branchId),
      });

      if (order) {
        await releaseTableIfEligible(order).catch((error) => {
          console.error("Table status synchronization failed:", error);
        });
      }
    }

    return res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error("Record payment error:", error);

    return res.status(500).json({
      success: false,
      message: getErrorMessage(error, "Failed to record payment."),
    });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const branchId = getRequestBranchId(req);
    const { invoiceId } = req.params;

    if (!isValidObjectId(branchId)) {
      return res.status(400).json({
        success: false,
        message: "Valid branch ID is required.",
      });
    }

    if (!isValidObjectId(invoiceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice ID.",
      });
    }

    const invoice = await Payment.findOne({
      _id: invoiceId,
      branchId,
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found.",
      });
    }

    if (
      Number(invoice.amountPaid || 0) > 0 ||
      (invoice.transactions && invoice.transactions.length > 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invoices with payment history cannot be deleted.",
      });
    }

    await Payment.deleteOne({
      _id: invoice._id,
      branchId,
    });

    return res.json({
      success: true,
      message: "Invoice deleted successfully.",
    });
  } catch (error) {
    console.error("Delete invoice error:", error);

    return res.status(500).json({
      success: false,
      message: getErrorMessage(error, "Failed to delete invoice."),
    });
  }
};

module.exports = {
  getInvoices,
  createInvoice,
  recordPayment,
  deleteInvoice,
};
