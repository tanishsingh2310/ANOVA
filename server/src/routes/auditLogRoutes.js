
const express = require("express");
const { getAuditLogs } = require("../controllers/auditLogController");
const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get(
  "/",
  authorize("owner", "admin"),
  getAuditLogs
);

module.exports = router;
