
const express = require("express");

const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
} = require("../controllers/employeeController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get(
  "/",
  authorize("owner", "admin", "hr", "manager"),
  getEmployees
);

router.get(
  "/:id",
  authorize("owner", "admin", "hr", "manager"),
  getEmployeeById
);

router.post(
  "/",
  authorize("owner", "admin", "hr"),
  createEmployee
);

router.patch(
  "/:id",
  authorize("owner", "admin", "hr"),
  updateEmployee
);

router.patch(
  "/:id/status",
  authorize("owner", "admin", "hr"),
  updateEmployeeStatus
);

module.exports = router;
