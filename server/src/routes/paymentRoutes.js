
const express = require("express");

const {
  getInvoices,
  createInvoice,
  recordPayment,
  deleteInvoice,
} = require("../controllers/paymentController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// Fetch invoices for a specific branch.
router.get(
  "/:branchId",
  authorize("owner", "admin", "manager", "cashier"),
  getInvoices
);

// Create an invoice from an existing order.
// The controller resolves and validates the branch context.
router.post(
  "/",
  authorize("owner", "admin", "manager", "cashier"),
  createInvoice
);

// Record payment for an invoice in a specific branch.
router.post(
  "/:branchId/:invoiceId/payments",
  authorize("owner", "admin", "manager", "cashier"),
  recordPayment
);

// Delete an unpaid invoice from a specific branch.
router.delete(
  "/:branchId/:invoiceId",
  authorize("owner", "admin", "manager"),
  deleteInvoice
);

module.exports = router;
