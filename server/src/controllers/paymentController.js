const mongoose = require("mongoose");

const Payment = require("../models/Payment");
const Order = require("../models/Order");

const calculateStatus = (amountPaid, total) => {
  if (amountPaid >= total) return "Paid";
  if (amountPaid > 0) return "Partially Paid";
  return "Pending";
};

// GET: Fetch all invoices belonging to a branch.
const getInvoices = async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({
        message: "Invalid branch ID.",
      });
    }

    const payments = await Payment.find({ branchId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(payments);
  } catch (error) {
    console.error("Fetch invoices error:", error);

    return res.status(500).json({
      message: "Failed to fetch invoices.",
    });
  }
};

// POST: Create an invoice from an existing order.
const createInvoice = async (req, res) => {
  try {
    const {
      branchId,
      orderId,
      discount = 0,
      taxRate = 5,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({
        message: "Invalid branch ID.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    if (
      !Number.isFinite(discount) ||
      discount < 0 ||
      !Number.isFinite(taxRate) ||
      taxRate < 0 ||
      taxRate > 100
    ) {
      return res.status(400).json({
        message: "Discount or tax rate is invalid.",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      branchId,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found in this branch.",
      });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({
        message: "An invoice cannot be created for a cancelled order.",
      });
    }

    const existingPayment = await Payment.findOne({
      branchId,
      orderId,
    });

    if (existingPayment) {
      return res.status(409).json({
        message: "An invoice already exists for this order.",
        invoice: existingPayment,
      });
    }

    const subtotal =
      Math.round(
        order.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        ) * 100
      ) / 100;

    if (discount > subtotal) {
      return res.status(400).json({
        message: "Discount cannot exceed the subtotal.",
      });
    }

    const taxableAmount = subtotal - discount;

    const taxAmount =
      Math.round(taxableAmount * (taxRate / 100) * 100) / 100;

    const total =
      Math.round((taxableAmount + taxAmount) * 100) / 100;

    if (total <= 0) {
      return res.status(400).json({
        message: "Invoice total must be greater than zero.",
      });
    }

    const invoiceCount = await Payment.countDocuments({
      branchId,
    });

    const invoiceNumber = `INV-${String(
      1001 + invoiceCount
    ).padStart(4, "0")}`;

    const invoice = await Payment.create({
      branchId,
      orderId: order._id,
      orderNumber: order.orderNumber,
      invoiceNumber,
      customer: order.customer,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal,
      discount,
      taxRate,
      total,
      amountPaid: 0,
      paymentMethod: "Not recorded",
      status: "Pending",
    });

    return res.status(201).json(invoice);
  } catch (error) {
    console.error("Create invoice error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "An invoice already exists for this order.",
      });
    }

    return res.status(500).json({
      message: "Failed to create invoice.",
    });
  }
};

// POST: Record a payment against an existing invoice.
const recordPayment = async (req, res) => {
  try {
    const { branchId, invoiceId } = req.params;
    const {
      amount,
      method,
      reference = "",
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({
        message: "Invalid branch ID.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({
        message: "Invalid invoice ID.",
      });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        message: "Payment amount must be greater than zero.",
      });
    }

    const allowedMethods = ["Cash", "Card", "UPI", "Online"];

    if (!allowedMethods.includes(method)) {
      return res.status(400).json({
        message: "Choose a valid payment method.",
      });
    }

    if (
      typeof reference !== "string" ||
      reference.length > 100
    ) {
      return res.status(400).json({
        message: "Payment reference is invalid.",
      });
    }

    const invoice = await Payment.findOne({
      _id: invoiceId,
      branchId,
    });

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found.",
      });
    }

    const outstanding =
      Math.round(
        (invoice.total - invoice.amountPaid) * 100
      ) / 100;

    if (outstanding <= 0) {
      return res.status(400).json({
        message: "This invoice is already fully paid.",
      });
    }

    if (amount > outstanding + 0.001) {
      return res.status(400).json({
        message: "Payment cannot exceed the outstanding balance.",
      });
    }

    invoice.transactions.push({
      amount,
      method,
      reference: reference.trim(),
    });

    invoice.amountPaid =
      Math.round(
        (invoice.amountPaid + amount) * 100
      ) / 100;

    invoice.paymentMethod = method;
    invoice.status = calculateStatus(
      invoice.amountPaid,
      invoice.total
    );

    await invoice.save();

    return res.json(invoice);
  } catch (error) {
    console.error("Record payment error:", error);

    return res.status(500).json({
      message: "Failed to record payment.",
    });
  }
};

module.exports = {
  getInvoices,
  createInvoice,
  recordPayment,
};
