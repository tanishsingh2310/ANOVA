const mongoose = require("mongoose");
const Branch = require("../models/Branch");
const { ENTERPRISE_ROLES } = require("../config/roles");

function respond(res, status, message) {
  return res.status(status).json({
    success: false,
    message
  });
}

module.exports = async (req, res, next) => {
  try {
    if (!req.user) {
      return respond(res, 401, "Authentication required.");
    }

    if (ENTERPRISE_ROLES.includes(req.user.role)) {
      return next();
    }

    const assignedBranchId = req.user.branchId;

    if (!assignedBranchId || !mongoose.isValidObjectId(assignedBranchId)) {
      return respond(res, 403, "Your account has no valid assigned branch.");
    }

    const target = req.body?.branch
      || req.body?.branchId
      || req.body?.fromBranch
      || req.query?.branch
      || req.params?.branch;

    if (!target || String(target).toLowerCase() === "all") {
      return respond(res, 403, "A specific assigned branch is required.");
    }

    const targetValue = String(target).trim();
    let targetBranch = null;

    if (mongoose.isValidObjectId(targetValue)) {
      targetBranch = await Branch.findById(targetValue).select("_id code isActive");
    }

    if (!targetBranch) {
      targetBranch = await Branch.findOne({
        code: targetValue.toUpperCase()
      }).select("_id code isActive");
    }

    if (!targetBranch || !targetBranch.isActive) {
      return respond(res, 403, "The requested branch is invalid or inactive.");
    }

    if (String(targetBranch._id) !== String(assignedBranchId)) {
      return respond(res, 403, "You cannot access a different branch.");
    }

    next();
  } catch (error) {
    next(error);
  }
};
