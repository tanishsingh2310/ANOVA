const express = require("express");

const {
  getInvoices,
  createInvoice,
  recordPayment,
} = require("../controllers/paymentController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

// GET: Fetch all invoices for a branch (cashier, manager, admin, owner).
router.get(
  "/:branchId",
  authorize("owner", "admin", "manager", "cashier"),
  getInvoices
);

// POST: Create an invoice from an existing order.
router.post(
  "/",
  authorize("owner", "admin", "manager", "cashier"),
  createInvoice
);

// POST: Record a payment against an existing invoice.
router.post(
  "/:branchId/:invoiceId/payments",
  authorize("owner", "admin", "manager", "cashier"),
  recordPayment
);

module.exports = router;
