
const mongoose = require("mongoose");
const AuditLog = require("../models/AuditLog");

const ALLOWED_STATUSES = ["success", "failure"];

const getAuditLogs = async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination. Page must be positive and limit must be between 1 and 100.",
      });
    }

    const {
      action,
      resource,
      status,
      actor,
      branch,
      from,
      to,
    } = req.query;

    const filter = {};

    if (action) {
      if (typeof action !== "string" || action.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Invalid action filter.",
        });
      }

      filter.action = action;
    }

    if (resource) {
      if (typeof resource !== "string" || resource.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Invalid resource filter.",
        });
      }

      filter.resource = resource;
    }

    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be success or failure.",
        });
      }

      filter.status = status;
    }

    if (actor) {
      if (!mongoose.isValidObjectId(actor)) {
        return res.status(400).json({
          success: false,
          message: "Invalid actor ID.",
        });
      }

      filter.actor = actor;
    }

    if (branch) {
      if (!mongoose.isValidObjectId(branch)) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch ID.",
        });
      }

      filter.branch = branch;
    }

    if (from || to) {
      filter.createdAt = {};

      if (from) {
        const fromDate = new Date(from);

        if (
          typeof from !== "string" ||
          Number.isNaN(fromDate.getTime())
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid from date.",
          });
        }

        filter.createdAt.$gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);

        if (
          typeof to !== "string" ||
          Number.isNaN(toDate.getTime())
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid to date.",
          });
        }

        filter.createdAt.$lte = toDate;
      }

      if (
        filter.createdAt.$gte &&
        filter.createdAt.$lte &&
        filter.createdAt.$gte > filter.createdAt.$lte
      ) {
        return res.status(400).json({
          success: false,
          message: "'from' must be earlier than or equal to 'to'.",
        });
      }
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      
AuditLog.find(filter)
  .select(
  "actor actorName actorRole action resource resourceId branch status createdAt"
)
  .sort({ createdAt: -1, _id: -1 })
  .skip(skip)
  .limit(limit)
  .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get audit logs error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve audit logs.",
    });
  }
};

module.exports = { getAuditLogs };
