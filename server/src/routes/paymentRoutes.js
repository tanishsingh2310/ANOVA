const express = require("express");

const {
  getInvoices,
  createInvoice,
  recordPayment,
} = require("../controllers/paymentController");

const router = express.Router();

// GET: Fetch all invoices for a branch.
router.get("/:branchId", getInvoices);

// POST: Create an invoice from an existing order.
router.post("/", createInvoice);

// POST: Record a payment against an existing invoice.
router.post("/:branchId/:invoiceId/payments", recordPayment);

module.exports = router;
