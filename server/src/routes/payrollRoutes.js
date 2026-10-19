
const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");

const {
  createPayroll,
  getPayrollRecords,
  getPayrollById,
  updatePayroll,
  approvePayroll,
  markPayrollPaid,
  cancelPayroll,
} = require("../controllers/payrollController");

const router = express.Router();

const PAYROLL_ROLES = ["owner", "admin", "hr"];

router.use(protect);
router.use(authorize(...PAYROLL_ROLES));

router.post("/", createPayroll);
router.get("/", getPayrollRecords);
router.get("/:id", getPayrollById);
router.patch("/:id", updatePayroll);
router.patch("/:id/approve", approvePayroll);
router.patch("/:id/pay", markPayrollPaid);
router.patch("/:id/cancel", cancelPayroll);

module.exports = router;
