const mongoose = require("mongoose");
const Branch = require("../models/Branch");
const { ROLES } = require("../config/roles");

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

    const isEnterprise = req.user.role === ROLES.OWNER ||
      (req.user.role === ROLES.ADMIN && !req.user.branchId && !req.user.branch);

    if (isEnterprise) {
      return next();
    }

    const assignedBranchId = req.user.branchId;

    if (!assignedBranchId || !mongoose.isValidObjectId(assignedBranchId)) {
      return respond(res, 403, "Your account has no valid assigned branch.");
    }

    let target = req.body?.branch
      || req.body?.branchId
      || req.body?.fromBranch
      || req.query?.branch
      || req.params?.branch;

    if (!target || String(target).toLowerCase() === "all") {
      if (req.body) {
        req.body.branch = assignedBranchId;
      }
      if (req.query) {
        req.query.branch = assignedBranchId;
      }
      target = assignedBranchId;
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

    req.branchDoc = targetBranch;
    next();
  } catch (error) {
    next(error);
  }
};
