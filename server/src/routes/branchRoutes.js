const express = require("express");
const {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  updateBranchStatus,
} = require("../controllers/branchController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post(
  "/",
  authorize("owner", "admin"),
  createBranch
);

router.get(
  "/",
  authorize(
    "owner",
    "admin",
    "manager",
    "hr",
    "inventory_manager",
    "chef",
    "cashier",
    "employee"
  ),
  getBranches
);

router.get(
  "/:id",
  authorize(
    "owner",
    "admin",
    "manager",
    "hr",
    "inventory_manager",
    "chef",
    "cashier",
    "employee"
  ),
  getBranchById
);

router.patch(
  "/:id",
  authorize("owner", "admin"),
  updateBranch
);

router.patch(
  "/:id/status",
  authorize("owner", "admin"),
  updateBranchStatus
);

module.exports = router;
